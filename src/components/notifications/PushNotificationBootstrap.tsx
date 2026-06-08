import { useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { navigateFromNotification } from "../../navigation/notificationNavigation";
import { navigationRef } from "../../navigation/rootNavigation";
import {
  isRemotePushSupported,
  notificationItemFromPushData,
  syncPushTokenFromListener,
  syncPushTokenWithBackend
} from "../../services/pushNotifications";
import { markNotificationRead } from "../../api/notifications.api";

function handleNotificationTap(
  response: import("expo-notifications").NotificationResponse | null
) {
  if (!response) return;
  const item = notificationItemFromPushData(
    response.notification.request.content.data as Record<string, unknown>
  );
  if (!item || !navigationRef.isReady()) return;

  if (item.id > 0) {
    void markNotificationRead(item.id).catch(() => {});
  }
  navigateFromNotification(navigationRef as never, item);
}

/**
 * Registers Expo push token and wires tap → deep link navigation.
 * No-op in Expo Go (use a development build for device push).
 */
export function PushNotificationBootstrap() {
  const { status } = useAuth();
  const pushSupported = isRemotePushSupported();

  useEffect(() => {
    if (status !== "home" || !pushSupported) return;
    void syncPushTokenWithBackend();
  }, [status, pushSupported]);

  useEffect(() => {
    if (status !== "home" || !pushSupported) return;

    let subTap: { remove: () => void } | undefined;
    let subToken: { remove: () => void } | undefined;
    let cancelled = false;

    void (async () => {
      const Notifications = await import("expo-notifications");
      if (cancelled) return;

      const last = await Notifications.getLastNotificationResponseAsync();
      if (last) handleNotificationTap(last);

      subTap = Notifications.addNotificationResponseReceivedListener(handleNotificationTap);
      subToken = Notifications.addPushTokenListener((event) => {
        void syncPushTokenFromListener(event.data);
      });
    })();

    return () => {
      cancelled = true;
      subTap?.remove();
      subToken?.remove();
    };
  }, [status, pushSupported]);

  return null;
}
