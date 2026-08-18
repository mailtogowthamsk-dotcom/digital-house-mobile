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
const PAGE_SIZE = 5;
const MIN_SEARCH_CHARS = 3;

function exploreNeedle(raw: string): string {
  return raw.trim().replace(/^[#@]+/, "").trim();
}

export function useExploreSearch() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<PostCardData[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [discovery, setDiscovery] = useState<ExploreDiscoveryResponse | null>(null);
  const genRef = useRef(0);
  const resultsLenRef = useRef(0);
  const allowLoadMoreRef = useRef(false);

  resultsLenRef.current = results.length;

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

  const typedLen = exploreNeedle(query).length;
  const canSearch = exploreNeedle(debouncedQuery).length >= MIN_SEARCH_CHARS;
  const waitingForMinChars = typedLen > 0 && typedLen < MIN_SEARCH_CHARS;
  const minCharsRemaining = waitingForMinChars ? MIN_SEARCH_CHARS - typedLen : 0;

  const runSearch = useCallback(async (q: string, offset: number, append: boolean) => {
    if (exploreNeedle(q).length < MIN_SEARCH_CHARS) {
      genRef.current += 1;
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
      const data = await searchExplore({ q, offset, limit: PAGE_SIZE });
      if (gen !== genRef.current) return;
      const cards = data.items.map(feedItemToPostCard);
      setResults((prev) => (append ? [...prev, ...cards] : cards));
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
    allowLoadMoreRef.current = false;
    void runSearch(debouncedQuery, 0, false);
  }, [debouncedQuery, runSearch]);

  const loadMore = useCallback(() => {
    if (!allowLoadMoreRef.current) return;
    if (!canSearch || loading || loadingMore || !hasMore) return;
    void runSearch(debouncedQuery, resultsLenRef.current, true);
  }, [canSearch, debouncedQuery, hasMore, loading, loadingMore, runSearch]);

  const noteUserScrolled = useCallback(() => {
    allowLoadMoreRef.current = true;
  }, []);

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
    void runSearch(debouncedQuery, 0, false);
  }, [debouncedQuery, runSearch]);

  return useMemo(
    () => ({
      query,
      setQuery,
      debouncedQuery,
      canSearch,
      waitingForMinChars,
      minCharsRemaining,
      minSearchChars: MIN_SEARCH_CHARS,
      results,
      loading,
      loadingMore,
      error,
      hasMore,
      total,
      recent,
      discovery,
      loadMore,
      noteUserScrolled,
      applyRecent,
      clearHistory,
      removeRecent,
      updatePost,
      retry
    }),
    [
      query,
      debouncedQuery,
      canSearch,
      waitingForMinChars,
      minCharsRemaining,
      results,
      loading,
      loadingMore,
      error,
      hasMore,
      total,
      recent,
      discovery,
      loadMore,
      noteUserScrolled,
      applyRecent,
      clearHistory,
      removeRecent,
      updatePost,
      retry
    ]
  );
}
