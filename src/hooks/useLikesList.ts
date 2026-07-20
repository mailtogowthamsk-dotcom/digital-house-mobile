/**
 * Paginated likes list — reusable for posts today; reels / comments / stories later
 * by swapping the fetch function.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getPostLikes,
  type PostLiker,
  type PostLikesResponse
} from "../api/posts.api";

export type LikesTarget =
  | { type: "post"; id: number }
  | { type: "reel"; id: number }
  | { type: "comment"; id: number };

const PAGE_SIZE = 30;

async function fetchLikes(
  target: LikesTarget,
  offset: number,
  limit: number
): Promise<PostLikesResponse> {
  switch (target.type) {
    case "post":
      return getPostLikes(target.id, { offset, limit });
    default:
      // Future: reel / comment likes endpoints
      return { items: [], total: 0, limit, offset, hasMore: false };
  }
}

export type UseLikesListResult = {
  items: PostLiker[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  error: string | null;
  hasMore: boolean;
  reload: () => Promise<void>;
  loadMore: () => Promise<void>;
};

export function useLikesList(
  target: LikesTarget | null,
  enabled: boolean
): UseLikesListResult {
  const [items, setItems] = useState<PostLiker[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetKey = target ? `${target.type}:${target.id}` : null;
  const offsetRef = useRef(0);
  const inFlightRef = useRef(false);
  const requestIdRef = useRef(0);

  const loadPage = useCallback(
    async (mode: "initial" | "refresh" | "more") => {
      if (!target || !enabled) return;
      if (inFlightRef.current && mode === "more") return;
      if (mode === "more" && !hasMore) return;

      const reqId = ++requestIdRef.current;
      inFlightRef.current = true;

      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      if (mode === "more") setLoadingMore(true);
      setError(null);

      const offset = mode === "more" ? offsetRef.current : 0;

      try {
        const res = await fetchLikes(target, offset, PAGE_SIZE);
        if (reqId !== requestIdRef.current) return;

        setTotal(res.total);
        setHasMore(res.hasMore);
        offsetRef.current = offset + res.items.length;

        setItems((prev) => {
          if (mode === "more") {
            const seen = new Set(prev.map((p) => p.userId));
            const merged = [...prev];
            for (const row of res.items) {
              if (!seen.has(row.userId)) merged.push(row);
            }
            return merged;
          }
          return res.items;
        });
      } catch (e) {
        if (reqId !== requestIdRef.current) return;
        setError((e as Error)?.message ?? "Failed to load likes");
        if (mode !== "more") setItems([]);
      } finally {
        if (reqId === requestIdRef.current) {
          inFlightRef.current = false;
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [target, enabled, hasMore]
  );

  useEffect(() => {
    offsetRef.current = 0;
    setItems([]);
    setTotal(0);
    setHasMore(false);
    setError(null);
    if (!enabled || !targetKey) return;
    void loadPage("initial");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when target/visibility changes
  }, [targetKey, enabled]);

  const reload = useCallback(async () => {
    await loadPage("refresh");
  }, [loadPage]);

  const loadMore = useCallback(async () => {
    await loadPage("more");
  }, [loadPage]);

  return {
    items,
    total,
    loading,
    loadingMore,
    refreshing,
    error,
    hasMore,
    reload,
    loadMore
  };
}
