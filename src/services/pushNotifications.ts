import { AppState, type AppStateStatus, Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import { getApiBaseUrl } from "../api/client";
import { registerPushToken, type NotificationItem } from "../api/notifications.api";
import { registerRealtimeTeardown } from "../realtime/teardown";

let handlerConfigured = false;
let expoGoWarned = false;
let appStateSub: { remove: () => void } | null = null;
let channelsReady = false;

/** Avoid hammering the API when the server is down or the token listener fires often */
let lastSyncedToken: string | null = null;
let lastFailAt = 0;
let lastWarnAt = 0;
let syncInFlight: Promise<boolean> | null = null;

const FAIL_COOLDOWN_MS = 90_000;
const WARN_COOLDOWN_MS = 90_000;

function isExpoPushTokenString(token: string): boolean {
  const t = token.trim();
  return t.startsWith("ExponentPushToken[") || t.startsWith("ExpoPushToken[");
}

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

async function ensureAndroidChannels() {
  if (Platform.OS !== "android" || !isRemotePushSupported()) return;
  if (channelsReady) return;
  const Notifications = await loadNotifications();
  // HIGH so tray alerts are visible; Android keeps first-created importance until uninstall.
  await Notifications.setNotificationChannelAsync("default", {
    name: "General",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#0B1220",
    sound: "default",
    enableVibrate: true,
    showBadge: true
  });
  await Notifications.setNotificationChannelAsync("matrimony", {
    name: "Matrimony",
    description: "Interests, matches, and profile updates",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 400, 200, 400],
    lightColor: "#7C3AED",
    sound: "default",
    enableVibrate: true,
    showBadge: true
  });
  channelsReady = true;
}

export async function configurePushNotifications(): Promise<void> {
  if (handlerConfigured) return;
  handlerConfigured = true;
  if (!isRemotePushSupported()) {
    warnExpoGoOnce();
    return;
  }

  const Notifications = await loadNotifications();
  // Show system banner/list while foreground so tray behavior matches background.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true
    })
  });

  void ensureAndroidChannels().catch((err) => {
    if (__DEV__) console.warn("[Push] channel setup failed", err);
  });

  // Re-register Expo token when user returns from system Settings after granting permission.
  if (!appStateSub) {
    appStateSub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next !== "active") return;
      void syncPushTokenWithBackend(false, { requestIfNeeded: false });
    });
  }
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

/** Raw OS request — prefer `ensurePushNotifications` from `src/permissions` for UX. */
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

export async function hasPushPermission(): Promise<boolean> {
  if (!isRemotePushSupported()) return false;
  const Notifications = await loadNotifications();
  const existing = await Notifications.getPermissionsAsync();
  return existing.status === "granted";
}

/**
 * Resolve Expo push token.
 * By default does NOT show the system permission dialog — only returns a token
 * when permission is already granted (safe for auth bootstrap / cold start).
 * Pass `requestIfNeeded: true` only from an explicit user gesture path.
 */
export async function getExpoPushToken(opts?: {
  requestIfNeeded?: boolean;
}): Promise<string | null> {
  if (!isRemotePushSupported()) return null;

  if (opts?.requestIfNeeded) {
    const granted = await requestPushPermissions();
    if (!granted) {
      if (__DEV__) console.info("[Push] permission not granted");
      return null;
    }
  } else {
    const granted = await hasPushPermission();
    if (!granted) return null;
  }

  await ensureAndroidChannels();

  const projectId = getExpoProjectId();
  if (!projectId) {
    if (__DEV__) console.warn("[Push] Missing EAS projectId in app.json extra.eas");
    return null;
  }

  try {
    const Notifications = await loadNotifications();
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    if (__DEV__) {
      const kind = isExpoPushTokenString(token.data) ? "expo" : "unknown";
      console.info(`[Push] got ${kind} token (len=${token.data.length})`);
    }
    return token.data;
  } catch (err) {
    if (__DEV__) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as Error).message)
          : "unknown";
      console.warn(
        `[Push] getExpoPushTokenAsync failed (${msg}). Ensure google-services.json + EAS FCM V1 credentials for Android.`
      );
    }
    return null;
  }
}

async function postPushTokenToBackend(expoToken: string): Promise<boolean> {
  if (!isExpoPushTokenString(expoToken)) {
    if (__DEV__) {
      console.warn(
        "[Push] refusing to register non-Expo token — use getExpoPushTokenAsync only"
      );
    }
    return false;
  }

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
    if (__DEV__) console.info("[Push] token registered with backend");
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

/**
 * Register device push token once per session; backs off after failures.
 * Does not request permission unless `requestIfNeeded` is true.
 */
export async function syncPushTokenWithBackend(
  force = false,
  opts?: { requestIfNeeded?: boolean }
): Promise<boolean> {
  if (!isRemotePushSupported()) return false;
  if (!force && syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    try {
      const token = await getExpoPushToken({ requestIfNeeded: opts?.requestIfNeeded === true });
      if (!token) return false;
      if (force) lastSyncedToken = null;
      return await postPushTokenToBackend(token);
    } finally {
      syncInFlight = null;
    }
  })();

  return syncInFlight;
}

/**
 * Native push-token listener fires with FCM/APNs device tokens — NOT Expo tokens.
 * Always re-resolve and register the Expo push token instead of posting native data.
 */
export async function syncPushTokenFromListener(_deviceToken?: string): Promise<boolean> {
  if (!isRemotePushSupported()) return false;
  return syncPushTokenWithBackend(true, { requestIfNeeded: false });
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
