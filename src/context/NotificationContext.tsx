import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  getNotificationCounts,
  type NotificationItem,
  type UnreadCounts
} from "../api/notifications.api";
import { subscribeNotifications } from "../realtime/notificationsRealtime";
import { InAppNotificationBanner } from "../components/notifications/InAppNotificationBanner";
import { useAuth } from "./AuthContext";
import { setBadgeCount } from "../services/pushNotifications";

type BannerState = {
  notification: NotificationItem;
} | null;

type NotificationContextValue = {
  counts: UnreadCounts;
  refreshCounts: () => Promise<void>;
  setCounts: (counts: UnreadCounts) => void;
  dismissBanner: () => void;
};

const defaultCounts: UnreadCounts = {
  total: 0,
  social: 0,
  matrimony: 0,
  messages: 0,
  community: 0,
  system: 0
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const [counts, setCounts] = useState<UnreadCounts>(defaultCounts);
  const [banner, setBanner] = useState<BannerState>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshCounts = useCallback(async () => {
    try {
      const c = await getNotificationCounts();
      setCounts(c);
    } catch {
      /* offline */
    }
  }, []);

  useEffect(() => {
    if (status !== "home") return;
    void refreshCounts();
  }, [status, refreshCounts]);

  useEffect(() => {
    if (status !== "home") return;
    void setBadgeCount(counts.total);
  }, [status, counts.total]);

  useEffect(() => {
    if (status !== "home") return;

    return subscribeNotifications({
      onNew: ({ notification, counts: next }) => {
        setCounts(next);
        if (bannerTimer.current) clearTimeout(bannerTimer.current);
        setBanner({ notification });
        bannerTimer.current = setTimeout(() => setBanner(null), 4500);
      },
      onCounts: (next) => setCounts(next)
    });
  }, [status]);

  const dismissBanner = useCallback(() => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    setBanner(null);
  }, []);

  const value = useMemo(
    () => ({ counts, refreshCounts, setCounts, dismissBanner }),
    [counts, refreshCounts, dismissBanner]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {banner ? (
        <InAppNotificationBanner
          item={banner.notification}
          onDismiss={dismissBanner}
          onCountsUpdate={setCounts}
        />
      ) : null}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications requires NotificationProvider");
  return ctx;
}

export function useNotificationsOptional() {
  return useContext(NotificationContext);
}
