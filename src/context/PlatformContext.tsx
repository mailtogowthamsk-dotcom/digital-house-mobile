import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  acknowledgePlatformPopup,
  fetchPlatformBootstrap,
  type PlatformBootstrap
} from "../api/platform.api";
import { useAuth } from "./AuthContext";

type PlatformContextValue = {
  bootstrap: PlatformBootstrap | null;
  loading: boolean;
  refresh: () => Promise<void>;
  isFeatureEnabled: (code: string) => boolean;
  isMenuVisible: (code: string) => boolean;
  softUpdateDismissed: boolean;
  dismissSoftUpdate: () => void;
  acknowledgePopup: (id: number) => Promise<void>;
  activePopup: PlatformBootstrap["popups"][number] | null;
};

const PlatformContext = createContext<PlatformContextValue | null>(null);

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const [bootstrap, setBootstrap] = useState<PlatformBootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [softUpdateDismissed, setSoftUpdateDismissed] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchPlatformBootstrap();
      setBootstrap(data);
    } catch {
      /* keep last known / allow offline entry */
    } finally {
      setLoading(false);
    }
  }, []);

  const authReady = status === "home" || status === "pending";

  useEffect(() => {
    void refresh();
  }, [refresh, authReady]);

  const isFeatureEnabled = useCallback(
    (code: string) => {
      if (!bootstrap?.features) return true;
      if (bootstrap.features[code] === undefined) return true;
      return Boolean(bootstrap.features[code]);
    },
    [bootstrap]
  );

  const isMenuVisible = useCallback(
    (code: string) => {
      if (!bootstrap?.menu) return true;
      return bootstrap.menu.some((m) => m.code === code);
    },
    [bootstrap]
  );

  const acknowledgePopup = useCallback(async (id: number) => {
    try {
      await acknowledgePlatformPopup(id);
    } catch {
      /* still dismiss locally */
    }
    setBootstrap((prev) =>
      prev ? { ...prev, popups: prev.popups.filter((p) => p.id !== id) } : prev
    );
  }, []);

  const activePopup = bootstrap?.popups?.[0] ?? null;

  const value = useMemo(
    () => ({
      bootstrap,
      loading,
      refresh,
      isFeatureEnabled,
      isMenuVisible,
      softUpdateDismissed,
      dismissSoftUpdate: () => setSoftUpdateDismissed(true),
      acknowledgePopup,
      activePopup
    }),
    [
      bootstrap,
      loading,
      refresh,
      isFeatureEnabled,
      isMenuVisible,
      softUpdateDismissed,
      acknowledgePopup,
      activePopup
    ]
  );

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatform must be used within PlatformProvider");
  return ctx;
}
