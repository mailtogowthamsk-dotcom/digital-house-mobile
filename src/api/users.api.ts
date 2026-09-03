import { api } from "./client";
import type { RelationshipStatus } from "./connections.api";

export type ProfileVisibility = "PUBLIC" | "PRIVATE";

export type DirectoryUser = {
  id: number;
  fullName: string;
  username: string;
  needsUsernameSetup?: boolean;
  profileImage: string | null;
  online: boolean;
  city: string | null;
  district: string | null;
  profileVisibility: ProfileVisibility;
  relationshipStatus: RelationshipStatus;

  // Community discovery: professional identity
  profession?: string | null;
  expertiseSummary?: string | null;
  availableForHelp?: boolean | null;
};

export type MemberProfileStats = {
  postsCount: number;
  connectionsCount: number;
  likesReceivedCount: number;
};

export type MemberProfile = {
  id: number;
  fullName: string;
  username: string;
  profileImage: string | null;
  city: string | null;
  district: string | null;
  community?: string | null;
  kulam?: string | null;
  occupation?: string | null;
  communityRole?: string | null;

  // Community discovery: professional identity
  profession?: string | null;
  company?: string | null;
  experience?: string | null;
  expertiseTags?: string[];
  availableForHelp?: boolean | null;

  memberSince?: string;
  profileVisibility: ProfileVisibility;
  isPrivatePreview: boolean;
  isSelf?: boolean;
  needsUsernameSetup?: boolean;
  relationshipStatus: RelationshipStatus;
  acceptsConnectionRequests?: boolean;
  stats?: MemberProfileStats;
  connectedSince?: string | null;
  canViewPosts?: boolean;
};

export type MemberPostItem = {
  postId: number;
  postType: string;
  title: string;
  description: string | null;
  mediaUrl: string | null;
  mediaType?: "image" | "video" | "none";
  thumbnailUrl?: string | null;
  videoDuration?: number | null;
  createdAt: string;
  counts: { likes: number; comments: number };
  likedByMe: boolean;
  savedByMe: boolean;
  isRepost?: boolean;
  originalPostId?: number | null;
  originalAuthorName?: string | null;
};

export type MemberPostsResponse = {
  items: MemberPostItem[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  canViewPosts: boolean;
  /** Connections-only posts hidden from non-connected viewers */
  connectionsOnlyHiddenCount?: number;
};

export type UsernameEligibility = {
  canChange: boolean;
  reason?: string;
  changesUsed: number;
  changesLimit: number;
  nextEligibleAt?: string;
};

export async function listUsers(): Promise<DirectoryUser[]> {
  const res = await api.get<{ ok: true; users: DirectoryUser[] }>("/users");
  return res.data.users ?? [];
}

export async function searchUsers(q: string): Promise<DirectoryUser[]> {
  const res = await api.get<{ ok: true; users: DirectoryUser[] }>("/users/search", {
    params: { q }
  });
  return res.data.users ?? [];
}

export async function getMemberProfile(identifier: string | number): Promise<MemberProfile> {
  const res = await api.get<{ ok: true; profile: MemberProfile }>(`/users/${identifier}`);
  return res.data.profile;
}

export async function getMemberPosts(
  identifier: string | number,
  params: { limit?: number; offset?: number } = {}
): Promise<MemberPostsResponse> {
  const limit = params.limit ?? 12;
  const offset = params.offset ?? 0;
  const res = await api.get<{ ok: true } & MemberPostsResponse>(`/users/${identifier}/posts`, {
    params: { limit, offset }
  });
  return {
    items: res.data.items ?? [],
    total: res.data.total ?? 0,
    limit: res.data.limit ?? limit,
    offset: res.data.offset ?? offset,
    hasMore: Boolean(res.data.hasMore),
    canViewPosts: res.data.canViewPosts !== false
  };
}

export async function checkUsernameAvailability(username: string): Promise<boolean> {
  const res = await api.get<{ ok: true; available: boolean }>("/users/username/availability", {
    params: { username }
  });
  return !!res.data.available;
}

export async function setUsername(username: string) {
  const res = await api.post<{ ok: true; user: import("./auth.api").MeUser }>("/users/username", {
    username
  });
  return res.data.user;
}

export async function changeUsername(username: string) {
  const res = await api.put<{
    ok: true;
    user: import("./auth.api").MeUser;
    eligibility: UsernameEligibility;
  }>("/users/username", { username });
  return res.data;
}

export async function getUsernameEligibility(): Promise<UsernameEligibility> {
  const res = await api.get<{ ok: true; eligibility: UsernameEligibility }>(
    "/users/username/eligibility"
  );
  return res.data.eligibility;
}

export async function updateProfileVisibility(profileVisibility: ProfileVisibility) {
  const res = await api.patch<{ ok: true; profileVisibility: ProfileVisibility }>(
    "/users/me/visibility",
    { profileVisibility }
  );
  return res.data.profileVisibility;
}

export async function updateConnectionRequests(allowConnectionRequests: boolean) {
  const res = await api.patch<{ ok: true; allowConnectionRequests: boolean }>(
    "/users/me/connection-requests",
    { allowConnectionRequests }
  );
  return res.data.allowConnectionRequests;
}

export type LastSeenVisibility = "EVERYONE" | "MATCHES_ONLY" | "NOBODY";

function parseLastSeenVisibility(raw: unknown): LastSeenVisibility {
  const v = String(raw ?? "").toUpperCase();
  if (v === "EVERYONE" || v === "MATCHES_ONLY" || v === "NOBODY") return v;
  return "EVERYONE";
}

export async function getLastSeenVisibility(): Promise<LastSeenVisibility> {
  const res = await api.get<{ ok: true; visibility: LastSeenVisibility }>(
    "/users/me/last-seen-visibility"
  );
  return parseLastSeenVisibility(res.data.visibility);
}

export async function updateLastSeenVisibility(
  visibility: LastSeenVisibility
): Promise<LastSeenVisibility> {
  const res = await api.patch<{ ok: true; visibility: LastSeenVisibility }>(
    "/users/me/last-seen-visibility",
    { visibility }
  );
  return parseLastSeenVisibility(res.data.visibility);
}

export type BlockedMember = {
  id: number;
  fullName: string;
  username: string | null;
};

export async function listBlockedMembers(): Promise<BlockedMember[]> {
  const res = await api.get<{ ok: true; users: BlockedMember[] }>("/users/me/blocks");
  return res.data.users ?? [];
}

export async function blockMember(userId: number) {
  const res = await api.post<{ ok: true; blocked: true }>(`/users/${userId}/block`);
  return res.data;
}

export async function unblockMember(userId: number) {
  const res = await api.delete<{ ok: true; unblocked: true }>(`/users/${userId}/block`);
  return res.data;
}

export const MEMBER_REPORT_REASONS = [
  { code: "FAKE_PROFILE", label: "Fake or misleading profile" },
  { code: "INAPPROPRIATE_PHOTO", label: "Inappropriate photo" },
  { code: "HARASSMENT", label: "Harassment or abuse" },
  { code: "SPAM", label: "Spam or solicitation" },
  { code: "WRONG_IDENTITY", label: "Wrong person / impersonation" },
  { code: "OTHER", label: "Other" }
] as const;

export async function reportMember(userId: number, reasonCode: string, details?: string) {
  const res = await api.post<{ ok: true; id: number; status: string }>(`/users/${userId}/report`, {
    reasonCode,
    details
  });
  return res.data;
}
