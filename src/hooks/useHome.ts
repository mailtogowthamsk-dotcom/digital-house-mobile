import { useState, useEffect, useCallback, useRef } from "react";
import { subscribePostSync } from "../utils/postSync";
import { profilePostToCardData } from "../utils/postMappers";
import { timeAgo } from "../utils/timeAgo";
import {
  getHomeSummary,
  getFeed,
  getHighlights,
  type HomeSummaryResponse,
  type FeedItem,
  type FeedResponse,
  type HighlightsResponse
} from "../api/home.api";
import type { PostCardData } from "../components/home/PostCard";
import { getImageUrl } from "../api/client";
import { prefetchAspectRatios } from "../utils/imageDimensions";

export type HomeState = {
  summary: HomeSummaryResponse | null;
  summaryLoading: boolean;
  summaryError: Error | null;
  feedItems: PostCardData[];
  feedTotal: number;
  feedLoading: boolean;
  feedLoadingMore: boolean;
  feedError: Error | null;
  feedSort: "recent" | "popular";
  feedNextCursor: number | null;
  highlights: HighlightsResponse | null;
  highlightsLoading: boolean;
  highlightsError: Error | null;
};

const FEED_PAGE_SIZE = 20;

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

function feedItemToPostCard(item: FeedItem): PostCardData {
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
    likedByMe: item.likedByMe ?? item.liked_by_me ?? false,
    savedByMe: item.savedByMe ?? false,
    isTrending: item.isTrending ?? false,
    engagementScore: item.engagementScore
  };
}

export function useHome() {
  const [summary, setSummary] = useState<HomeSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<Error | null>(null);

  const [feedItems, setFeedItems] = useState<PostCardData[]>([]);
  const [feedTotal, setFeedTotal] = useState(0);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedLoadingMore, setFeedLoadingMore] = useState(false);
  const [feedError, setFeedError] = useState<Error | null>(null);
  const [feedSort, setFeedSort] = useState<"recent" | "popular">("recent");
  const [feedNextCursor, setFeedNextCursor] = useState<number | null>(null);

  const [highlights, setHighlights] = useState<HighlightsResponse | null>(null);
  const [highlightsLoading, setHighlightsLoading] = useState(true);
  const [highlightsError, setHighlightsError] = useState<Error | null>(null);

  const feedSortRef = useRef(feedSort);
  feedSortRef.current = feedSort;

  const summaryRef = useRef(summary);
  summaryRef.current = summary;

  const fetchSummary = useCallback(async (opts?: { background?: boolean }) => {
    const cached = summaryRef.current;
    const background = opts?.background === true && cached != null;

    if (!background) {
      setSummaryError(null);
      if (!cached) setSummaryLoading(true);
    }

    try {
      const data = await getHomeSummary();
      setSummary(data);
      setSummaryError(null);
    } catch (e) {
      if (!cached) {
        setSummaryError(e instanceof Error ? e : new Error("Failed to load summary"));
      }
    } finally {
      if (!background || !cached) {
        setSummaryLoading(false);
      }
    }
  }, []);

  const fetchFeed = useCallback(async (append: boolean, cursor?: number | null) => {
    if (append) setFeedLoadingMore(true);
    else {
      setFeedError(null);
      setFeedLoading(true);
    }
    try {
      const data: FeedResponse = await getFeed({
        limit: FEED_PAGE_SIZE,
        sort: feedSortRef.current,
        ...(append && cursor ? { cursor } : { page: 1 })
      });
      setFeedTotal(data.total);
      setFeedNextCursor(data.nextCursor ?? null);
      if (data.sort) setFeedSort(data.sort);

      const mapped = data.items.map(feedItemToPostCard);
      if (append) {
        setFeedItems((prev) => {
          const ids = new Set(prev.map((p) => p.id));
          return [...prev, ...mapped.filter((p) => !ids.has(p.id))];
        });
      } else {
        setFeedItems(mapped);
      }
      const mediaUris = mapped
        .map((p) => getImageUrl(p.imageUri))
        .filter((u): u is string => !!u);
      if (mediaUris.length) prefetchAspectRatios(mediaUris);
    } catch (e) {
      setFeedError(e instanceof Error ? e : new Error("Failed to load feed"));
    } finally {
      setFeedLoading(false);
      setFeedLoadingMore(false);
    }
  }, []);

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

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchFeed(false);
  }, [fetchFeed]);

  useEffect(() => {
    fetchHighlights();
  }, [fetchHighlights]);

  const refetchAll = useCallback(async () => {
    setFeedError(null);
    setHighlightsError(null);
    const hasSummary = summaryRef.current != null;
    if (!hasSummary) setSummaryError(null);
    await Promise.all([
      fetchSummary({ background: hasSummary }),
      fetchFeed(false),
      fetchHighlights()
    ]);
  }, [fetchSummary, fetchFeed, fetchHighlights]);

  const loadMoreFeed = useCallback(() => {
    if (feedLoadingMore || feedLoading) return;
    if (feedItems.length >= feedTotal && !feedNextCursor) return;
    if (feedSort === "recent" && feedNextCursor) {
      fetchFeed(true, feedNextCursor);
    } else if (feedItems.length < feedTotal) {
      const page = Math.floor(feedItems.length / FEED_PAGE_SIZE) + 1;
      void getFeed({ page, limit: FEED_PAGE_SIZE, sort: feedSort }).then((data) => {
        setFeedTotal(data.total);
        setFeedNextCursor(data.nextCursor ?? null);
        const mapped = data.items.map(feedItemToPostCard);
        setFeedItems((prev) => {
          const ids = new Set(prev.map((p) => p.id));
          return [...prev, ...mapped.filter((p) => !ids.has(p.id))];
        });
      });
    }
  }, [
    feedLoadingMore,
    feedLoading,
    feedNextCursor,
    feedSort,
    feedItems.length,
    feedTotal,
    fetchFeed
  ]);

  const updatePost = useCallback((postId: string, patch: Partial<PostCardData>) => {
    setFeedItems((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, ...patch } : p))
    );
  }, []);

  const removePost = useCallback((postId: number) => {
    const id = String(postId);
    setFeedItems((prev) => prev.filter((p) => p.id !== id));
    setFeedTotal((t) => Math.max(0, t - 1));
  }, []);

  const prependFeedPost = useCallback((post: import("../api/profile.api").ProfilePostItem, userName: string) => {
    const card = profilePostToCardData(post, userName);
    card.timeAgo = timeAgo(post.createdAt);
    setFeedItems((prev) => {
      if (prev.some((p) => p.id === card.id)) return prev;
      return [card, ...prev];
    });
    setFeedTotal((t) => t + 1);
  }, []);

  useEffect(() => {
    return subscribePostSync((event) => {
      if (event.type === "deleted") removePost(event.postId);
      else if (event.type === "created") {
        const name = summaryRef.current?.user?.name ?? "You";
        prependFeedPost(event.post, name);
      }
    });
  }, [removePost, prependFeedPost]);

  const setFeedSortMode = useCallback(
    (sort: "recent" | "popular") => {
      feedSortRef.current = sort;
      setFeedSort(sort);
      fetchFeed(false);
    },
    [fetchFeed]
  );

  const state: HomeState = {
    summary,
    summaryLoading,
    summaryError,
    feedItems,
    feedTotal,
    feedLoading,
    feedLoadingMore,
    feedError,
    feedSort,
    feedNextCursor,
    highlights,
    highlightsLoading,
    highlightsError
  };

  return {
    state,
    refetchAll,
    loadMoreFeed,
    updatePost,
    removePost,
    prependFeedPost,
    setFeedSortMode,
    retrySummary: () => fetchSummary({ background: summaryRef.current != null }),
    retryFeed: () => fetchFeed(false),
    retryHighlights: fetchHighlights
  };
}
