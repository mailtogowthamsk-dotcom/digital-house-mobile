import { useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { navigateFromNotification } from "../../navigation/notificationNavigation";
import { navigationRef } from "../../navigation/rootNavigation";
import {
  isRemotePushSupported,
  notificationItemFromPushData,
  syncPushTokenWithBackend
} from "../../services/pushNotifications";
import { markNotificationRead } from "../../api/notifications.api";

function handleNotificationTap(
  response: import("expo-notifications").NotificationResponse | null
) {
  if (!response) return false;
  const item = notificationItemFromPushData(
    response.notification.request.content.data as Record<string, unknown>
  );
  if (!item || !navigationRef.isReady()) return false;

  if (item.id > 0) {
    void markNotificationRead(item.id).catch(() => {});
  }
  navigateFromNotification(navigationRef as never, item);
  return true;
}

/**
 * Syncs Expo push token when already granted, and wires tap → deep link navigation.
 * Does NOT request notification permission on login / cold start — that is
 * user-initiated via Settings or the notification-center soft prompt.
 * Does NOT subscribe to addPushTokenListener — resolving Expo tokens inside that
 * listener re-fires it and can flood POST /push-token (seen in prod logs).
 * Token refresh: bootstrap + AppState active (handled in pushNotifications).
 * No-op in Expo Go (use a development build for device push).
 */
export function PushNotificationBootstrap() {
  const { status } = useAuth();
  const pushSupported = isRemotePushSupported();

  useEffect(() => {
    const gateOk =
      status === "home" || status === "pending" || status === "changes_requested";
    if (!gateOk || !pushSupported) return;
    // Sync only if OS permission already granted — never prompt here.
    void syncPushTokenWithBackend(false, { requestIfNeeded: false });
  }, [status, pushSupported]);

  useEffect(() => {
    if (status !== "home" || !pushSupported) return;

    let subTap: { remove: () => void } | undefined;
    let unsubscribeReady: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      const Notifications = await import("expo-notifications");
      if (cancelled) return;

      let handledId: string | undefined;
      function consume(response: import("expo-notifications").NotificationResponse | null) {
        if (!response || cancelled) return;
        const id = response.notification.request.identifier;
        if (id === handledId || !handleNotificationTap(response)) return;
        handledId = id;
        Notifications.clearLastNotificationResponse();
      }
      // A cold-start tap can arrive before the signed-in navigator mounts.
      const consumeLast = () => consume(Notifications.getLastNotificationResponse());
      unsubscribeReady = navigationRef.addListener("ready", consumeLast);
      subTap = Notifications.addNotificationResponseReceivedListener(consume);
      consumeLast();
    })();

    return () => {
      cancelled = true;
      unsubscribeReady?.();
      subTap?.remove();
    };
  }, [status, pushSupported]);

  return null;
}
