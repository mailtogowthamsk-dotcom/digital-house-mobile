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
};

export type MemberProfile = {
  id: number;
  fullName: string;
  username: string;
  profileImage: string | null;
  city: string | null;
  district: string | null;
  community?: string | null;
  occupation?: string | null;
  communityRole?: string | null;
  memberSince?: string;
  profileVisibility: ProfileVisibility;
  isPrivatePreview: boolean;
  isSelf?: boolean;
  needsUsernameSetup?: boolean;
  relationshipStatus: RelationshipStatus;
  acceptsConnectionRequests?: boolean;
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
