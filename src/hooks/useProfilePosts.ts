import { useState, useCallback, useEffect, useRef } from "react";
import { getProfilePosts, type ProfilePostItem } from "../api/profile.api";
import { subscribePostSync } from "../utils/postSync";

const PAGE_SIZE = 12;

export function useProfilePosts(enabled: boolean) {
  const [items, setItems] = useState<ProfilePostItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const genRef = useRef(0);

  const fetchPage = useCallback(
    async (pageNum: number, append: boolean) => {
      if (!enabled) return;
      const gen = ++genRef.current;
      if (append) setLoadingMore(true);
      else {
        setLoading(true);
        setError(null);
      }
      try {
        const data = await getProfilePosts(pageNum, PAGE_SIZE);
        if (gen !== genRef.current) return;
        setTotal(data.total);
        setPage(data.page);
        if (append) {
          setItems((prev) => {
            const ids = new Set(prev.map((p) => p.postId));
            return [...prev, ...data.items.filter((p) => !ids.has(p.postId))];
          });
        } else {
          setItems(data.items);
        }
      } catch (e) {
        if (gen !== genRef.current) return;
        if (!append) {
          setError(e instanceof Error ? e : new Error("Failed to load posts"));
          setItems([]);
        }
      } finally {
        if (gen === genRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [enabled]
  );

  const refetch = useCallback(() => fetchPage(1, false), [fetchPage]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || items.length >= total) return;
    fetchPage(page + 1, true);
  }, [loading, loadingMore, items.length, total, page, fetchPage]);

  const removePost = useCallback((postId: number) => {
    setItems((prev) => prev.filter((p) => p.postId !== postId));
    setTotal((t) => Math.max(0, t - 1));
  }, []);

  const prependPost = useCallback((post: ProfilePostItem) => {
    setItems((prev) => {
      if (prev.some((p) => p.postId === post.postId)) return prev;
      return [post, ...prev];
    });
    setTotal((t) => t + 1);
  }, []);

  useEffect(() => {
    if (enabled) refetch();
    else {
      setItems([]);
      setTotal(0);
    }
  }, [enabled, refetch]);

  useEffect(() => {
    if (!enabled) return;
    return subscribePostSync((event) => {
      if (event.type === "deleted") removePost(event.postId);
      else if (event.type === "created") prependPost(event.post);
    });
  }, [enabled, removePost, prependPost]);

  return {
    items,
    total,
    loading,
    loadingMore,
    error,
    refetch,
    loadMore,
    removePost,
    prependPost
  };
}
