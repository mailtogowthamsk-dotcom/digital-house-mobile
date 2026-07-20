/**
 * Paginated member profile posts — separate from Home Feed.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getMemberPosts, type MemberPostItem } from "../api/users.api";
import { subscribePostSync } from "../utils/postSync";

export function useMemberPosts(
  identifier: string | number | null | undefined,
  enabled: boolean,
  pageSize = 12
) {
  const [items, setItems] = useState<MemberPostItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [canViewPosts, setCanViewPosts] = useState(true);
  const [connectionsOnlyHiddenCount, setConnectionsOnlyHiddenCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const offsetRef = useRef(0);
  const genRef = useRef(0);
  const inFlightMore = useRef(false);

  const fetchPage = useCallback(
    async (mode: "initial" | "more" | "refresh") => {
      if (!identifier || !enabled) return;
      if (mode === "more") {
        if (inFlightMore.current || !hasMore) return;
        inFlightMore.current = true;
      }
      const gen = ++genRef.current;
      if (mode === "initial") {
        setLoading(true);
        setError(null);
      } else if (mode === "refresh") {
        setError(null);
      } else {
        setLoadingMore(true);
      }

      const offset = mode === "more" ? offsetRef.current : 0;
      try {
        const data = await getMemberPosts(identifier, { limit: pageSize, offset });
        if (gen !== genRef.current) return;
        setCanViewPosts(data.canViewPosts);
        setConnectionsOnlyHiddenCount(data.connectionsOnlyHiddenCount ?? 0);
        setTotal(data.total);
        setHasMore(data.hasMore);
        offsetRef.current = offset + data.items.length;
        setItems((prev) => {
          if (mode === "more") {
            const seen = new Set(prev.map((p) => p.postId));
            return [...prev, ...data.items.filter((p) => !seen.has(p.postId))];
          }
          return data.items;
        });
      } catch (e) {
        if (gen !== genRef.current) return;
        setError(e instanceof Error ? e.message : "Failed to load posts");
        if (mode !== "more") setItems([]);
      } finally {
        if (gen === genRef.current) {
          setLoading(false);
          setLoadingMore(false);
          inFlightMore.current = false;
        }
      }
    },
    [identifier, enabled, pageSize, hasMore]
  );

  useEffect(() => {
    offsetRef.current = 0;
    setItems([]);
    setTotal(0);
    setHasMore(false);
    setConnectionsOnlyHiddenCount(0);
    if (enabled && identifier != null) void fetchPage("initial");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identifier, enabled, pageSize]);

  useEffect(() => {
    return subscribePostSync((event) => {
      if (event.type !== "updated") return;
      const { postId, patch } = event;
      setItems((prev) =>
        prev.map((p) => {
          if (p.postId !== postId) return p;
          return {
            ...p,
            counts: {
              likes: patch.likeCount ?? p.counts.likes,
              comments: patch.commentCount ?? p.counts.comments
            },
            likedByMe: patch.likedByMe ?? p.likedByMe,
            savedByMe: patch.savedByMe ?? p.savedByMe
          };
        })
      );
    });
  }, []);

  const updatePost = useCallback(
    (
      postId: string | number,
      patch: Partial<{
        likeCount: number;
        commentCount: number;
        likedByMe: boolean;
        savedByMe: boolean;
      }>
    ) => {
      const id = Number(postId);
      setItems((prev) =>
        prev.map((p) => {
          if (p.postId !== id) return p;
          return {
            ...p,
            counts: {
              likes: patch.likeCount ?? p.counts.likes,
              comments: patch.commentCount ?? p.counts.comments
            },
            likedByMe: patch.likedByMe ?? p.likedByMe,
            savedByMe: patch.savedByMe ?? p.savedByMe
          };
        })
      );
    },
    []
  );

  return {
    items,
    total,
    hasMore,
    canViewPosts,
    connectionsOnlyHiddenCount,
    loading,
    loadingMore,
    error,
    reload: () => fetchPage("refresh"),
    loadMore: () => fetchPage("more"),
    updatePost
  };
}
