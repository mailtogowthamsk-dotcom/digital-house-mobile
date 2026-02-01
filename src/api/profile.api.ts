import { api } from "./client";

// ---------------------------------------------------------------------------
// Types – match backend GET /api/profile/me (snake_case)
// ---------------------------------------------------------------------------

/** Basic section (from User) */
export type BasicSection = {
  full_name: string;
  date_of_birth: string | null;
  email: string;
  mobile: string | null;
  gender: string | null;
  native_district: string | null;
  role: string | null;
};

/** Extended profile sections (modular) */
export type ProfileSections = {
  basic: BasicSection;
  community: Record<string, unknown> | null;
  personal: Record<string, unknown> | null;
  matrimony: Record<string, unknown> | null;
  business: Record<string, unknown> | null;
  family: Record<string, unknown> | null;
};

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
  completion_percentage?: number;
  show_matrimony?: boolean;
  show_business?: boolean;
  sections?: ProfileSections;
  /** Pending approval status for restricted sections (Matrimony / Business) */
  pending_matrimony?: { status: "PENDING" | "APPROVED" | "REJECTED"; admin_remarks?: string | null } | null;
  pending_business?: { status: "PENDING" | "APPROVED" | "REJECTED"; admin_remarks?: string | null } | null;
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

const defaultPersonalInfo = {
  masked_mobile: "—",
  masked_email: "—",
  gender: null as string | null,
  dob: null as string | null,
  blood_group: null as string | null,
  city: null as string | null,
  district: null as string | null
};

const defaultProfessionalInfo = {
  education: null as string | null,
  job_title: null as string | null,
  company_name: null as string | null,
  work_location: null as string | null,
  skills: null as string | null
};

const defaultStats = {
  total_posts: 0,
  jobs_posted: 0,
  marketplace_items: 0,
  help_requests: 0
};

/** GET /api/profile/me – full profile (masked email/mobile) + stats + sections + completion */
export async function getProfile(): Promise<ProfileMeResponse> {
  const { data } = await api.get<{ ok: boolean } & ProfileMeResponse>("/profile/me");
  if (!data?.ok) throw new Error((data as any)?.message ?? "Failed to load profile");
  return {
    id: data.id ?? 0,
    name: data.name?.trim() || "User",
    profile_image: data.profile_image ?? null,
    verified: data.verified ?? false,
    member_since: data.member_since ?? "—",
    personal_info: data.personal_info
      ? { ...defaultPersonalInfo, ...data.personal_info }
      : defaultPersonalInfo,
    professional_info: data.professional_info
      ? { ...defaultProfessionalInfo, ...data.professional_info }
      : defaultProfessionalInfo,
    stats: data.stats ? { ...defaultStats, ...data.stats } : defaultStats,
    completion_percentage: data.completion_percentage,
    show_matrimony: data.show_matrimony,
    show_business: data.show_business,
    sections: data.sections ?? undefined,
    pending_matrimony: data.pending_matrimony,
    pending_business: data.pending_business
  };
}

/** PUT /api/profile/me – update editable fields only; returns updated profile */
export async function updateProfile(payload: ProfileUpdatePayload): Promise<ProfileMeResponse> {
  const { data } = await api.put<{ ok: boolean } & ProfileMeResponse>("/profile/me", payload);
  if (!data?.ok) throw new Error((data as any)?.message ?? "Failed to update profile");
  return {
    id: data.id ?? 0,
    name: data.name?.trim() || "User",
    profile_image: data.profile_image ?? null,
    verified: data.verified ?? false,
    member_since: data.member_since ?? "—",
    personal_info: data.personal_info
      ? { ...defaultPersonalInfo, ...data.personal_info }
      : defaultPersonalInfo,
    professional_info: data.professional_info
      ? { ...defaultProfessionalInfo, ...data.professional_info }
      : defaultProfessionalInfo,
    stats: data.stats ? { ...defaultStats, ...data.stats } : defaultStats,
    completion_percentage: data.completion_percentage,
    show_matrimony: data.show_matrimony,
    show_business: data.show_business,
    sections: data.sections,
    pending_matrimony: data.pending_matrimony,
    pending_business: data.pending_business
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

// ---------------------------------------------------------------------------
// Section-wise profile update + horoscope upload
// ---------------------------------------------------------------------------

export type ProfileSectionName = "basic" | "community" | "personal" | "matrimony" | "business" | "family";

/** PATCH /api/profile/me/sections/:section – update one section; returns full profile */
export async function updateProfileSection(
  section: ProfileSectionName,
  payload: Record<string, unknown>
): Promise<ProfileMeResponse> {
  const { data } = await api.patch<{ ok: boolean } & ProfileMeResponse>(`/profile/me/sections/${section}`, payload);
  if (!data.ok) throw new Error("Failed to update profile section");
  return data as ProfileMeResponse;
}

/** PUT /api/profile/:section – update one section (basic | community | personal | matrimony | business | family); returns full profile */
export async function putProfileSection(
  section: ProfileSectionName,
  payload: Record<string, unknown>
): Promise<ProfileMeResponse> {
  const { data } = await api.put<{ ok: boolean } & ProfileMeResponse>(`/profile/${section}`, payload);
  if (!data.ok) throw new Error("Failed to update profile section");
  return data as ProfileMeResponse;
}

export type HoroscopeUploadUrlResponse = { uploadUrl: string; publicUrl: string };

/** POST /api/profile/me/horoscope-upload-url – get presigned URL for horoscope (PDF/image); client then PUTs to R2 and PATCHes matrimony with publicUrl */
export async function getHoroscopeUploadUrl(payload: {
  fileName: string;
  fileType: "application/pdf" | "image/jpeg" | "image/png";
  fileSize: number;
}): Promise<HoroscopeUploadUrlResponse> {
  const { data } = await api.post<{ ok: boolean } & HoroscopeUploadUrlResponse>("/profile/me/horoscope-upload-url", payload);
  if (!data.ok) throw new Error("Failed to get upload URL");
  return { uploadUrl: (data as any).uploadUrl, publicUrl: (data as any).publicUrl };
}
