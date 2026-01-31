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
};

export type FeedResponse = {
  items: FeedItem[];
  page: number;
  limit: number;
  total: number;
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
  return {
    user: data.user!,
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

/** GET /api/home/feed – paginated community feed */
export async function getFeed(page: number, limit: number): Promise<FeedResponse> {
  const { data } = await api.get<{ ok: boolean } & FeedResponse>("/home/feed", {
    params: { page, limit }
  });
  if (!data.ok) throw new Error("Failed to load feed");
  return {
    items: data.items ?? [],
    page: data.page ?? page,
    limit: data.limit ?? limit,
    total: data.total ?? 0
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
