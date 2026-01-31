import { api } from "./client";

// ---------------------------------------------------------------------------
// Types – match backend GET /api/profile/me (snake_case)
// ---------------------------------------------------------------------------

export type ProfileMeResponse = {
  id: number;
  name: string;
  profile_image: string | null;
  verified: boolean;
  member_since: string;
  personal_info: {
    masked_mobile: string;
    masked_email: string;
    gender: string | null;
    dob: string | null;
    blood_group: string | null;
    city: string | null;
    district: string | null;
  };
  professional_info: {
    education: string | null;
    job_title: string | null;
    company_name: string | null;
    work_location: string | null;
    skills: string | null;
  };
  stats: {
    total_posts: number;
    jobs_posted: number;
    marketplace_items: number;
    help_requests: number;
  };
};

/** Editable fields for PUT /api/profile/me (on update → PENDING_REVIEW) */
export type ProfileUpdatePayload = {
  profile_image?: string | null;
  city?: string | null;
  district?: string | null;
  education?: string | null;
  job_title?: string | null;
  company_name?: string | null;
  work_location?: string | null;
  skills?: string | null;
};

export type ProfileActivityItem = {
  postId: number;
  title: string;
  postType: string;
  createdAt: string;
  status: string;
};

export type ProfileActivityResponse = {
  items: ProfileActivityItem[];
  page: number;
  limit: number;
  total: number;
};

// ---------------------------------------------------------------------------
// API – JWT required; 401/403 handled by caller
// ---------------------------------------------------------------------------

/** GET /api/profile/me – full profile (masked email/mobile) + stats */
export async function getProfile(): Promise<ProfileMeResponse> {
  const { data } = await api.get<{ ok: boolean } & ProfileMeResponse>("/profile/me");
  if (!data.ok) throw new Error("Failed to load profile");
  return {
    id: data.id!,
    name: data.name!,
    profile_image: data.profile_image ?? null,
    verified: data.verified ?? false,
    member_since: data.member_since ?? "—",
    personal_info: data.personal_info!,
    professional_info: data.professional_info!,
    stats: data.stats!
  };
}

/** PUT /api/profile/me – update editable fields only; returns updated profile */
export async function updateProfile(payload: ProfileUpdatePayload): Promise<ProfileMeResponse> {
  const { data } = await api.put<{ ok: boolean } & ProfileMeResponse>("/profile/me", payload);
  if (!data.ok) throw new Error("Failed to update profile");
  return {
    id: data.id!,
    name: data.name!,
    profile_image: data.profile_image ?? null,
    verified: data.verified ?? false,
    member_since: data.member_since ?? "—",
    personal_info: data.personal_info!,
    professional_info: data.professional_info!,
    stats: data.stats!
  };
}

/** GET /api/profile/activity?tab=my|saved|liked&page=1&limit=20 */
export async function getProfileActivity(
  tab: "my" | "saved" | "liked",
  page: number,
  limit: number
): Promise<ProfileActivityResponse> {
  const { data } = await api.get<{ ok: boolean } & ProfileActivityResponse>("/profile/activity", {
    params: { tab, page, limit }
  });
  if (!data.ok) throw new Error("Failed to load activity");
  return {
    items: data.items ?? [],
    page: data.page ?? page,
    limit: data.limit ?? limit,
    total: data.total ?? 0
  };
}
