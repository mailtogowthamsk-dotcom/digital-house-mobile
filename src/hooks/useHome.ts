import { useState, useEffect, useCallback } from "react";
import {
  getHomeSummary,
  getFeed,
  getHighlights,
  type HomeSummaryResponse,
  type FeedItem,
  type FeedResponse,
  type HighlightsResponse
} from "../api/home.api";
import { getPost } from "../api/posts.api";
import { timeAgo } from "../utils/timeAgo";
import type { PostCardData } from "../components/home/PostCard";

// ---------------------------------------------------------------------------
// Mapped types for UI (no inline API types in components)
// ---------------------------------------------------------------------------

export type HomeState = {
  /** Header + Welcome card */
  summary: HomeSummaryResponse | null;
  summaryLoading: boolean;
  summaryError: Error | null;

  /** Community feed (paginated) */
  feedItems: PostCardData[];
  feedPage: number;
  feedTotal: number;
  feedLoading: boolean;
  feedLoadingMore: boolean;
  feedError: Error | null;

  /** Pinned announcements, upcoming meetups, urgent help */
  highlights: HighlightsResponse | null;
  highlightsLoading: boolean;
  highlightsError: Error | null;
};

const FEED_PAGE_SIZE = 20;

/** Map backend post type to display label */
function postTypeLabel(postType: string): string {
  const labels: Record<string, string> = {
    ANNOUNCEMENT: "Announcement",
    JOB: "Job",
    MARKETPLACE: "Marketplace",
    MATRIMONY: "Matrimony",
    ACHIEVEMENT: "Achievement",
    MEETUP: "Meetup",
    HELP_REQUEST: "Help Request",
    ENTERTAINMENT: "Entertainment"
  };
  return labels[postType] ?? postType;
}

/** Map feed item from API to PostCardData */
function feedItemToPostCard(item: FeedItem): PostCardData {
  const likedByMe = item.likedByMe ?? item.liked_by_me ?? false;
  return {
    id: String(item.postId),
    userName: item.author.name,
    userAvatarUri: item.author.profileImage,
    timeAgo: timeAgo(item.createdAt),
    postType: postTypeLabel(item.postType),
    title: item.title,
    description: item.description ?? "",
    imageUri: item.mediaUrl,
    likeCount: item.counts.likes,
    commentCount: item.counts.comments,
    likedByMe
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useHome() {
  const [summary, setSummary] = useState<HomeSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<Error | null>(null);

  const [feedItems, setFeedItems] = useState<PostCardData[]>([]);
  const [feedPage, setFeedPage] = useState(1);
  const [feedTotal, setFeedTotal] = useState(0);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedLoadingMore, setFeedLoadingMore] = useState(false);
  const [feedError, setFeedError] = useState<Error | null>(null);

  const [highlights, setHighlights] = useState<HighlightsResponse | null>(null);
  const [highlightsLoading, setHighlightsLoading] = useState(true);
  const [highlightsError, setHighlightsError] = useState<Error | null>(null);

  /** Fetch summary (user + unread counts); used for header and welcome card */
  const fetchSummary = useCallback(async () => {
    setSummaryError(null);
    setSummaryLoading(true);
    try {
      const data = await getHomeSummary();
      setSummary(data);
    } catch (e) {
      setSummaryError(e instanceof Error ? e : new Error("Failed to load summary"));
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  /** Fetch feed page 1 (reset list) or next page (append); then fetch liked_by_me for each post */
  const fetchFeed = useCallback(async (page: number, append: boolean) => {
    if (append) {
      setFeedLoadingMore(true);
    } else {
      setFeedError(null);
      setFeedLoading(true);
    }
    try {
      const data: FeedResponse = await getFeed(page, FEED_PAGE_SIZE);
      setFeedTotal(data.total);
      setFeedPage(data.page);
      const mapped = data.items.map(feedItemToPostCard);

      const likedResults = await Promise.allSettled(
        data.items.map((item) =>
          getPost(item.postId).then((post) => ({
            postId: String(item.postId),
            likedByMe: post.liked_by_me,
            likeCount: post.like_count
          }))
        )
      );

      const likedMap = new Map<string, { likedByMe: boolean; likeCount: number }>();
      likedResults.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value) {
          likedMap.set(result.value.postId, {
            likedByMe: result.value.likedByMe,
            likeCount: result.value.likeCount
          });
        }
      });

      const merged = mapped.map((p) => {
        const extra = likedMap.get(p.id);
        if (extra) return { ...p, likedByMe: extra.likedByMe, likeCount: extra.likeCount };
        return p;
      });

      if (append) {
        setFeedItems((prev) => {
          const ids = new Set(prev.map((p) => p.id));
          const newOnes = merged.filter((p) => !ids.has(p.id));
          return [...prev, ...newOnes];
        });
      } else {
        setFeedItems(merged);
      }
    } catch (e) {
      setFeedError(e instanceof Error ? e : new Error("Failed to load feed"));
    } finally {
      setFeedLoading(false);
      setFeedLoadingMore(false);
    }
  }, []);

  /** Fetch highlights */
  const fetchHighlights = useCallback(async () => {
    setHighlightsError(null);
    setHighlightsLoading(true);
    try {
      const data = await getHighlights();
      setHighlights(data);
    } catch (e) {
      setHighlightsError(e instanceof Error ? e : new Error("Failed to load highlights"));
    } finally {
      setHighlightsLoading(false);
    }
  }, []);

  /** Initial load: summary + quick-actions (counts from summary) + feed page 1 + highlights */
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  /** Feed: load first page when component mounts */
  useEffect(() => {
    fetchFeed(1, false);
  }, [fetchFeed]);

  /** Highlights: load on mount */
  useEffect(() => {
    fetchHighlights();
  }, [fetchHighlights]);

  /** Pull-to-refresh: refetch all sections */
  const refetchAll = useCallback(async () => {
    setSummaryError(null);
    setFeedError(null);
    setHighlightsError(null);
    await Promise.all([fetchSummary(), fetchFeed(1, false), fetchHighlights()]);
  }, [fetchSummary, fetchFeed, fetchHighlights]);

  /** Load next page of feed (infinite scroll) */
  const loadMoreFeed = useCallback(() => {
    const nextPage = Math.floor(feedItems.length / FEED_PAGE_SIZE) + 1;
    const totalPages = Math.ceil(feedTotal / FEED_PAGE_SIZE);
    if (feedLoadingMore || feedLoading || nextPage > totalPages || feedItems.length >= feedTotal) return;
    fetchFeed(nextPage, true);
  }, [feedItems.length, feedTotal, feedLoading, feedLoadingMore, fetchFeed]);

  /** Update like count and liked state for a post (e.g. after double-tap like) */
  const updatePostLike = useCallback(
    (postId: string, likeCount: number, likedByMe: boolean) => {
      setFeedItems((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, likeCount, likedByMe } : p
        )
      );
    },
    []
  );

  const state: HomeState = {
    summary,
    summaryLoading,
    summaryError,
    feedItems,
    feedPage,
    feedTotal,
    feedLoading,
    feedLoadingMore,
    feedError,
    highlights,
    highlightsLoading,
    highlightsError
  };

  return {
    state,
    refetchAll,
    loadMoreFeed,
    updatePostLike,
    retrySummary: fetchSummary,
    retryFeed: () => fetchFeed(1, false),
    retryHighlights: fetchHighlights
  };
}
