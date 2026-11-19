import {
  isRemotePushSupported,
  requestPushPermissions as requestOsPushPermission
} from "../services/pushNotifications";
import { runEnsureFlow } from "./ensureFlow";
import type { EnsurePermissionResult, PermissionOutcome } from "./types";

async function loadNotifications() {
  return import("expo-notifications");
}

function mapNotificationStatus(
  status: string,
  canAskAgain: boolean,
  ios?: { status?: number }
): { outcome: PermissionOutcome; canAskAgain: boolean } {
  // expo-notifications: granted | denied | undetermined
  // iOS may expose ephemeral / provisional — treat provisional as granted for token sync.
  if (status === "granted") {
    return { outcome: "granted", canAskAgain: true };
  }
  if (ios && typeof ios.status === "number") {
    // 3 = PROVISIONAL on older mappings; keep granted if Expo says granted above.
  }
  if (status === "undetermined") {
    return { outcome: "undetermined", canAskAgain: true };
  }
  return {
    outcome: canAskAgain ? "denied" : "blocked",
    canAskAgain
  };
}

export async function getPushPermissionStatus(): Promise<{
  outcome: PermissionOutcome;
  canAskAgain: boolean;
}> {
  if (!isRemotePushSupported()) {
    return { outcome: "unavailable", canAskAgain: false };
  }
  const Notifications = await loadNotifications();
  const existing = await Notifications.getPermissionsAsync();
  return mapNotificationStatus(
    existing.status,
    existing.canAskAgain !== false,
    existing.ios as { status?: number } | undefined
  );
}

/**
 * User-initiated push permission (Settings toggle, soft prompt, etc.).
 * Requests system permission when needed.
 */
export async function ensurePushNotifications(opts?: {
  showDeniedUi?: boolean;
}): Promise<EnsurePermissionResult> {
  if (!isRemotePushSupported()) {
    return { ok: false, outcome: "unavailable" };
  }

  return runEnsureFlow({
    getStatus: getPushPermissionStatus,
    request: async () => {
      const granted = await requestOsPushPermission();
      if (granted) return { outcome: "granted" as const, canAskAgain: true };
      return getPushPermissionStatus();
    },
    guidance: {
      title: "Notifications are off",
      message: "Enable notifications to receive push alerts from Digital House.",
      blockedMessage:
        "Notifications are blocked for Digital House. Open Settings → Digital House → Notifications and turn them on."
    },
    showDeniedUi: opts?.showDeniedUi
  });
}
