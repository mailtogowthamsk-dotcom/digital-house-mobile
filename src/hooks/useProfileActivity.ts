import { useState, useEffect, useCallback } from "react";
import { getProfileActivity } from "../api/profile.api";
import type { ProfileActivityItem } from "../api/profile.api";

export function useProfileActivity(tab: "my" | "saved" | "liked", enabled: boolean) {
  const [items, setItems] = useState<ProfileActivityItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchActivity = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const data = await getProfileActivity(tab, 1, 20);
      setItems(data.items);
      setTotal(data.total);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [tab, enabled]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  return { items, total, loading, refetch: fetchActivity };
}
