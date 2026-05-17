import { api } from "./client";

// ---------------------------------------------------------------------------
// Types (match backend DTOs – no email/mobile)
// ---------------------------------------------------------------------------

export type HomeUserBasic = {
  name: string;
  profileImage: string | null;
  verified: boolean;
};

export type QuickActionCounts = {
  totalPosts: number;
  openJobs: number;
  marketplaceItems: number;
  matrimonyProfiles: number;
  helpingHandRequests: number;
  communityUpdates: number;
};

export type HomeSummaryResponse = {
  user: HomeUserBasic;
  quickActionCounts: QuickActionCounts;
  unreadNotificationsCount: number;
  unreadMessagesCount: number;
};

export type FeedAuthor = {
  name: string;
  profileImage: string | null;
  verified: boolean;
};

export type FeedItem = {
  postId: number;
  postType: string;
  title: string;
  description: string | null;
  mediaUrl: string | null;
  createdAt: string;
  author: FeedAuthor;
  counts: { likes: number; comments: number };
  likedByMe?: boolean;
  liked_by_me?: boolean;
  savedByMe?: boolean;
  engagementScore?: number;
  isTrending?: boolean;
};

export type FeedQueryParams = {
  page?: number;
  limit: number;
  cursor?: number;
  sort?: "recent" | "popular";
};

export type FeedResponse = {
  items: FeedItem[];
  page: number;
  limit: number;
  total: number;
  nextCursor?: number | null;
  sort?: "recent" | "popular";
};

export type HighlightItem = {
  postId: number;
  postType: string;
  title: string;
  description: string | null;
  mediaUrl: string | null;
  createdAt: string;
  pinned?: boolean;
  urgent?: boolean;
  meetupAt?: string | null;
};

export type HighlightsResponse = {
  pinnedAnnouncements: HighlightItem[];
  upcomingMeetups: HighlightItem[];
  urgentHelpRequests: HighlightItem[];
};

// ---------------------------------------------------------------------------
// API functions – all require JWT (token attached by client interceptor)
// ---------------------------------------------------------------------------

/** GET /api/home/summary – user info, quick action counts, unread notifications/messages */
export async function getHomeSummary(): Promise<HomeSummaryResponse> {
  const { data } = await api.get<{ ok: boolean } & HomeSummaryResponse>("/home/summary");
  if (!data.ok) throw new Error("Failed to load home summary");
  const u = data.user as Record<string, unknown> | undefined;
  const profileImage = u && (u.profileImage ?? u.profile_image);
  const user: HomeUserBasic = {
    name: (u?.name as string) ?? "User",
    profileImage: typeof profileImage === "string" ? profileImage : null,
    verified: !!(u?.verified ?? false)
  };
  return {
    user,
    quickActionCounts: data.quickActionCounts!,
    unreadNotificationsCount: data.unreadNotificationsCount ?? 0,
    unreadMessagesCount: data.unreadMessagesCount ?? 0
  };
}

/** GET /api/home/quick-actions – module counters only */
export async function getQuickActions(): Promise<QuickActionCounts> {
  const { data } = await api.get<{ ok: boolean } & QuickActionCounts>("/home/quick-actions");
  if (!data.ok) throw new Error("Failed to load quick actions");
  return {
    totalPosts: data.totalPosts ?? 0,
    openJobs: data.openJobs ?? 0,
    marketplaceItems: data.marketplaceItems ?? 0,
    matrimonyProfiles: data.matrimonyProfiles ?? 0,
    helpingHandRequests: data.helpingHandRequests ?? 0,
    communityUpdates: data.communityUpdates ?? 0
  };
}

/** GET /api/home/feed – ranked community feed (cursor or page) */
export async function getFeed(params: FeedQueryParams): Promise<FeedResponse> {
  const { data } = await api.get<{ ok: boolean } & FeedResponse>("/home/feed", {
    params: {
      limit: params.limit,
      sort: params.sort ?? "recent",
      ...(params.cursor != null ? { cursor: params.cursor } : { page: params.page ?? 1 })
    }
  });
  if (!data.ok) throw new Error("Failed to load feed");
  return {
    items: data.items ?? [],
    page: data.page ?? params.page ?? 1,
    limit: data.limit ?? params.limit,
    total: data.total ?? 0,
    nextCursor: data.nextCursor ?? null,
    sort: data.sort ?? params.sort ?? "recent"
  };
}

/** GET /api/home/highlights – pinned announcements, upcoming meetups, urgent help */
export async function getHighlights(): Promise<HighlightsResponse> {
  const { data } = await api.get<{ ok: boolean } & HighlightsResponse>("/home/highlights");
  if (!data.ok) throw new Error("Failed to load highlights");
  return {
    pinnedAnnouncements: data.pinnedAnnouncements ?? [],
    upcomingMeetups: data.upcomingMeetups ?? [],
    urgentHelpRequests: data.urgentHelpRequests ?? []
  };
}
