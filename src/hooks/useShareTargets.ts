import { useCallback, useEffect, useRef, useState } from "react";
import { listConnections } from "../api/connections.api";
import { listThreads } from "../api/messages.api";

export type ShareTarget = {
  id: number;
  fullName: string;
  username: string;
  profileImage: string | null;
  /** True when there is a recent DM thread — shown first. */
  hasRecentChat: boolean;
  lastMessageAt: string | null;
};

/**
 * Connected members sorted for in-app share: recent conversations first, then alphabetically.
 */
export function useShareTargets(enabled: boolean) {
  const [targets, setTargets] = useState<ShareTarget[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const genRef = useRef(0);

  const reload = useCallback(async () => {
    const gen = ++genRef.current;
    setLoading(true);
    setError(null);
    try {
      const [connections, threads] = await Promise.all([
        listConnections(),
        listThreads().catch(() => [] as Awaited<ReturnType<typeof listThreads>>)
      ]);
      if (gen !== genRef.current) return;

      const threadMap = new Map(
        threads.map((t) => [
          t.otherUser.id,
          t.lastMessage?.createdAt ?? null
        ])
      );

      const merged: ShareTarget[] = connections.map((c) => ({
        id: c.user.id,
        fullName: c.user.fullName,
        username: c.user.username,
        profileImage: c.user.profileImage,
        hasRecentChat: threadMap.has(c.user.id),
        lastMessageAt: threadMap.get(c.user.id) ?? null
      }));

      merged.sort((a, b) => {
        if (a.hasRecentChat !== b.hasRecentChat) return a.hasRecentChat ? -1 : 1;
        const ta = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
        const tb = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
        if (ta !== tb) return tb - ta;
        return a.fullName.localeCompare(b.fullName);
      });

      setTargets(merged);
    } catch (e) {
      if (gen !== genRef.current) return;
      setError(e instanceof Error ? e.message : "Failed to load connections");
      setTargets([]);
    } finally {
      if (gen === genRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setTargets([]);
      setError(null);
      return;
    }
    void reload();
  }, [enabled, reload]);

  return { targets, loading, error, reload };
}
