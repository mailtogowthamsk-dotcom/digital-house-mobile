import { useCallback, useEffect, useRef, useState } from "react";
import { listConnections } from "../api/connections.api";
import { listThreads } from "../api/messages.api";
import { getMatrimonyMatches } from "../api/matrimony.api";

export type ShareTargetKind = "connection" | "matrimony" | "chat";

export type ShareTarget = {
  id: number;
  fullName: string;
  username: string;
  profileImage: string | null;
  /** True when there is a recent DM thread — shown first. */
  hasRecentChat: boolean;
  lastMessageAt: string | null;
  kind: ShareTargetKind;
};

type MatchRow = {
  chatEnabled?: boolean;
  candidate?: {
    userId?: number;
    displayName?: string;
    fullName?: string;
    name?: string;
    username?: string;
    photoUrl?: string | null;
    profileImage?: string | null;
  };
};

/**
 * People you can message in chat:
 * - community connections
 * - matrimony matches with chat enabled
 * - anyone already in the messages thread list
 *
 * Recent conversations first, then A–Z.
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
      const [connections, threads, matchesRaw] = await Promise.all([
        listConnections().catch(() => [] as Awaited<ReturnType<typeof listConnections>>),
        listThreads().catch(() => [] as Awaited<ReturnType<typeof listThreads>>),
        getMatrimonyMatches().catch(() => [] as unknown[])
      ]);
      if (gen !== genRef.current) return;

      const byId = new Map<number, ShareTarget>();

      const upsert = (next: ShareTarget) => {
        const prev = byId.get(next.id);
        if (!prev) {
          byId.set(next.id, next);
          return;
        }
        byId.set(next.id, {
          ...prev,
          fullName: next.fullName || prev.fullName,
          username: next.username || prev.username,
          profileImage: next.profileImage ?? prev.profileImage,
          hasRecentChat: prev.hasRecentChat || next.hasRecentChat,
          lastMessageAt: next.lastMessageAt ?? prev.lastMessageAt,
          kind:
            prev.kind === "connection" || next.kind === "connection"
              ? "connection"
              : prev.kind === "matrimony" || next.kind === "matrimony"
                ? "matrimony"
                : "chat"
        });
      };

      for (const c of connections) {
        upsert({
          id: c.user.id,
          fullName: c.user.fullName,
          username: c.user.username,
          profileImage: c.user.profileImage,
          hasRecentChat: false,
          lastMessageAt: null,
          kind: "connection"
        });
      }

      for (const t of threads) {
        const lanes = t.chatLanes;
        const accessOk =
          lanes == null ||
          lanes.length === 0 ||
          lanes.includes("community") ||
          lanes.includes("matrimony");
        if (!accessOk) continue;
        const isMatrimonyOnly =
          Array.isArray(lanes) && lanes.includes("matrimony") && !lanes.includes("community");
        upsert({
          id: t.otherUser.id,
          fullName: t.otherUser.name,
          username: "",
          profileImage: t.otherUser.profileImage,
          hasRecentChat: Boolean(t.lastMessage),
          lastMessageAt: t.lastMessage?.createdAt ?? null,
          kind: isMatrimonyOnly ? "matrimony" : "chat"
        });
      }

      for (const raw of matchesRaw as MatchRow[]) {
        if (raw?.chatEnabled === false) continue;
        const cand = raw?.candidate;
        const id = Number(cand?.userId);
        if (!Number.isFinite(id) || id <= 0) continue;
        const name =
          cand?.displayName?.trim() ||
          cand?.fullName?.trim() ||
          cand?.name?.trim() ||
          "Match";
        upsert({
          id,
          fullName: name,
          username: cand?.username?.trim() || "",
          profileImage: cand?.photoUrl ?? cand?.profileImage ?? null,
          hasRecentChat: false,
          lastMessageAt: null,
          kind: "matrimony"
        });
      }

      const merged = [...byId.values()];
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
      setError(e instanceof Error ? e.message : "Failed to load chat list");
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
