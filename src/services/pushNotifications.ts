import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import { getApiBaseUrl } from "../api/client";
import { registerPushToken, type NotificationItem } from "../api/notifications.api";
import { registerRealtimeTeardown } from "../realtime/teardown";

let handlerConfigured = false;
let expoGoWarned = false;

/** Avoid hammering the API when the server is down or the token listener fires often */
let lastSyncedToken: string | null = null;
let lastFailAt = 0;
let lastWarnAt = 0;
let syncInFlight: Promise<boolean> | null = null;

const FAIL_COOLDOWN_MS = 90_000;
const WARN_COOLDOWN_MS = 90_000;

/** Expo Go (SDK 53+) cannot register for remote push on Android/iOS */
export function isExpoGo(): boolean {
  return (
    Constants.appOwnership === "expo" ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  );
}

/** Device push works in dev/production builds, not in Expo Go */
export function isRemotePushSupported(): boolean {
  if (isExpoGo()) return false;
  if (!Device.isDevice) return false;
  if (Platform.OS === "web") return false;
  return true;
}

async function loadNotifications() {
  return import("expo-notifications");
}

function warnExpoGoOnce() {
  if (!__DEV__ || expoGoWarned || !isExpoGo()) return;
  expoGoWarned = true;
  console.info(
    "[Push] Remote push is not available in Expo Go (SDK 53+). Use a development build: npx expo run:android or EAS build. In-app notifications still work via socket."
  );
}

export async function configurePushNotifications(): Promise<void> {
  if (handlerConfigured) return;
  handlerConfigured = true;
  if (!isRemotePushSupported()) {
    warnExpoGoOnce();
    return;
  }

  const Notifications = await loadNotifications();
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: false,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: false,
      shouldShowList: true
    })
  });
}

async function ensureAndroidChannels() {
  if (Platform.OS !== "android" || !isRemotePushSupported()) return;
  const Notifications = await loadNotifications();
  await Notifications.setNotificationChannelAsync("default", {
    name: "General",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#0B1220"
  });
  await Notifications.setNotificationChannelAsync("matrimony", {
    name: "Matrimony",
    description: "Interests, matches, and profile updates",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 400, 200, 400],
    lightColor: "#7C3AED"
  });
}

function resolvePlatform(): "ios" | "android" | "web" {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return "web";
}

function getExpoProjectId(): string | undefined {
  const eas = Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined;
  return eas?.projectId ?? Constants.easConfig?.projectId;
}

export async function requestPushPermissions(): Promise<boolean> {
  if (!isRemotePushSupported()) {
    warnExpoGoOnce();
    return false;
  }
  const Notifications = await loadNotifications();
  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true }
    });
    status = requested.status;
  }
  return status === "granted";
}

export async function getExpoPushToken(): Promise<string | null> {
  if (!isRemotePushSupported()) return null;

  const granted = await requestPushPermissions();
  if (!granted) return null;

  await ensureAndroidChannels();

  const projectId = getExpoProjectId();
  if (!projectId) {
    if (__DEV__) console.warn("[Push] Missing EAS projectId in app.json extra.eas");
    return null;
  }

  const Notifications = await loadNotifications();
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

async function postPushTokenToBackend(expoToken: string): Promise<boolean> {
  const now = Date.now();
  if (expoToken === lastSyncedToken) return true;
  if (lastFailAt && now - lastFailAt < FAIL_COOLDOWN_MS) return false;

  try {
    await registerPushToken({
      token: expoToken,
      platform: resolvePlatform(),
      deviceId: Constants.sessionId ?? null,
      appVersion: Constants.expoConfig?.version ?? null
    });
    lastSyncedToken = expoToken;
    lastFailAt = 0;
    return true;
  } catch (err) {
    lastFailAt = Date.now();
    if (__DEV__ && now - lastWarnAt >= WARN_COOLDOWN_MS) {
      lastWarnAt = now;
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as Error).message)
          : "unknown error";
      console.warn(
        `[Push] register failed (${msg}). API: ${getApiBaseUrl()} — ensure backend is running and phone is on same Wi‑Fi. Retrying in ${FAIL_COOLDOWN_MS / 1000}s.`
      );
    }
    return false;
  }
}

/** Register device push token once per session; backs off after failures. */
export async function syncPushTokenWithBackend(force = false): Promise<boolean> {
  if (!isRemotePushSupported()) return false;
  if (!force && syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    try {
      const token = await getExpoPushToken();
      if (!token) return false;
      if (force) lastSyncedToken = null;
      return await postPushTokenToBackend(token);
    } finally {
      syncInFlight = null;
    }
  })();

  return syncInFlight;
}

/** Called when Expo reports a new push token */
export async function syncPushTokenFromListener(deviceToken: string): Promise<boolean> {
  if (!isRemotePushSupported()) return false;
  if (!deviceToken?.trim()) return false;
  if (deviceToken === lastSyncedToken) return true;
  if (syncInFlight) return syncInFlight;
  syncInFlight = postPushTokenToBackend(deviceToken).finally(() => {
    syncInFlight = null;
  });
  return syncInFlight;
}

export function resetPushRegistrationState() {
  lastSyncedToken = null;
  lastFailAt = 0;
  syncInFlight = null;
}

registerRealtimeTeardown(resetPushRegistrationState);

export function notificationItemFromPushData(
  data: Record<string, unknown> | undefined
): NotificationItem | null {
  if (!data) return null;
  const id = Number(data.notificationId ?? 0);
  if (!Number.isFinite(id)) return null;

  const category = String(data.category ?? "SYSTEM") as NotificationItem["category"];
  const actorUserIdRaw = data.actorUserId ? Number(data.actorUserId) : null;

  return {
    id,
    type: String(data.type ?? "SYSTEM_GENERIC"),
    category,
    title: "",
    body: null,
    image: null,
    actionType: data.actionType ? String(data.actionType) : null,
    actionTargetId: data.actionTargetId ? String(data.actionTargetId) : null,
    actorUserId: Number.isFinite(actorUserIdRaw) ? actorUserIdRaw : null,
    actorName: data.actorName ? String(data.actorName) : null,
    groupCount: 1,
    priority: category === "MATRIMONY" ? 1 : 0,
    isRead: false,
    readAt: null,
    createdAt: new Date().toISOString()
  };
}

export async function setBadgeCount(count: number) {
  if (!isRemotePushSupported()) return;
  try {
    const Notifications = await loadNotifications();
    await Notifications.setBadgeCountAsync(Math.max(0, count));
  } catch {
    /* unsupported */
  }
}
