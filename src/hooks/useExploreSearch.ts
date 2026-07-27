import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  searchExplore,
  getExploreDiscovery,
  type ExploreDiscoveryResponse
} from "../api/explore.api";
import type { PostCardData } from "../components/home/PostCard";
import { feedItemToPostCard } from "../utils/postMappers";
import {
  loadRecentSearches,
  pushRecentSearch,
  clearRecentSearches,
  removeRecentSearch
} from "../utils/exploreRecentSearches";

const DEBOUNCE_MS = 350;
const PAGE_SIZE = 20;

export function useExploreSearch() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<PostCardData[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [discovery, setDiscovery] = useState<ExploreDiscoveryResponse | null>(null);
  const genRef = useRef(0);

  useEffect(() => {
    void loadRecentSearches().then(setRecent);
    void getExploreDiscovery()
      .then(setDiscovery)
      .catch(() => setDiscovery({ trendingHashtags: [], suggestedTopics: [] }));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const runSearch = useCallback(async (q: string, nextPage: number, append: boolean) => {
    if (!q) {
      setResults([]);
      setHasMore(false);
      setTotal(0);
      setError(null);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    const gen = ++genRef.current;
    if (append) setLoadingMore(true);
    else {
      setLoading(true);
      setError(null);
    }

    try {
      const data = await searchExplore({ q, page: nextPage, limit: PAGE_SIZE });
      if (gen !== genRef.current) return;
      const cards = data.items.map(feedItemToPostCard);
      setResults((prev) => (append ? [...prev, ...cards] : cards));
      setPage(data.page);
      setHasMore(data.hasMore);
      setTotal(data.total);
      setError(null);
      if (!append) {
        const nextRecent = await pushRecentSearch(q);
        setRecent(nextRecent);
      }
    } catch (e: unknown) {
      if (gen !== genRef.current) return;
      if (!append) {
        setResults([]);
        setError(e instanceof Error ? e.message : "Search failed");
      }
    } finally {
      if (gen === genRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    void runSearch(debouncedQuery, 1, false);
  }, [debouncedQuery, runSearch]);

  const loadMore = useCallback(() => {
    if (!debouncedQuery || loading || loadingMore || !hasMore) return;
    void runSearch(debouncedQuery, page + 1, true);
  }, [debouncedQuery, hasMore, loading, loadingMore, page, runSearch]);

  const applyRecent = useCallback((q: string) => {
    setQuery(q);
  }, []);

  const clearHistory = useCallback(async () => {
    await clearRecentSearches();
    setRecent([]);
  }, []);

  const removeRecent = useCallback(async (q: string) => {
    const next = await removeRecentSearch(q);
    setRecent(next);
  }, []);

  const updatePost = useCallback((id: string, patch: Partial<PostCardData>) => {
    setResults((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const retry = useCallback(() => {
    void runSearch(debouncedQuery, 1, false);
  }, [debouncedQuery, runSearch]);

  return useMemo(
    () => ({
      query,
      setQuery,
      debouncedQuery,
      results,
      loading,
      loadingMore,
      error,
      hasMore,
      total,
      recent,
      discovery,
      loadMore,
      applyRecent,
      clearHistory,
      removeRecent,
      updatePost,
      retry
    }),
    [
      query,
      debouncedQuery,
      results,
      loading,
      loadingMore,
      error,
      hasMore,
      total,
      recent,
      discovery,
      loadMore,
      applyRecent,
      clearHistory,
      removeRecent,
      updatePost,
      retry
    ]
  );
}
