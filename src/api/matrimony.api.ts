import { api } from "./client";

export type MatrimonyHubStatus =
  | "NOT_STARTED"
  | "DRAFT"
  | "PENDING"
  | "CHANGES_REQUESTED"
  | "RESUBMITTED"
  | "APPROVED"
  | "REJECTED";

export type MatrimonyChangeRequest = {
  comment: string;
  sections: string[];
  requestedAt: string;
  requestedBy: string;
};

export type MatrimonyCandidatePhotoStatus =
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "REUPLOAD_REQUESTED";

export type MatrimonyProfileData = {
  matrimonyProfileActive?: boolean;
  lookingFor?: "SELF" | "SON" | "DAUGHTER" | "BROTHER" | "SISTER" | null;
  partnerGenderPreference?: "MALE" | "FEMALE" | null;
  candidatePhotoUrl?: string | null;
  profilePhotoUrl?: string | null;
  useAccountProfilePhoto?: boolean | null;
  candidatePhotoStatus?: MatrimonyCandidatePhotoStatus | null;
  candidateName?: string | null;
  candidateAge?: number | null;
  candidateGender?: "MALE" | "FEMALE" | null;
  candidateDistrict?: string | null;
  height?: string | null;
  complexion?: string | null;
  motherTongue?: string | null;
  aboutMe?: string | null;
  gotra?: string | null;
  kulamSnapshot?: string | null;
  education?: string | null;
  occupation?: string | null;
  employer?: string | null;
  annualIncome?: string | null;
  maritalStatus?: string | null;
  rashi?: string | null;
  nakshatram?: string | null;
  dosham?: string | null;
  familyType?: string | null;
  familyStatus?: string | null;
  motherName?: string | null;
  fatherOccupation?: string | null;
  brothersCount?: number | null;
  sistersCount?: number | null;
  partnerAgeMin?: number | null;
  partnerAgeMax?: number | null;
  preferredDistrictIds?: number[] | null;
  preferredKulamIds?: number[] | null;
  horoscopeDocumentUrl?: string | null;
};

export type MatrimonyHub = {
  status: MatrimonyHubStatus;
  completion_percentage: number;
  can_browse: boolean;
  can_submit: boolean;
  missing_fields: string[];
  approved: MatrimonyProfileData | null;
  draft: MatrimonyProfileData | null;
  pending: {
    status: "PENDING" | "REJECTED" | "CHANGES_REQUESTED" | "RESUBMITTED";
    admin_remarks: string | null;
    change_request: MatrimonyChangeRequest | null;
    requested_fields: string[];
    pending_update_id: number | null;
  } | null;
  user_context: {
    full_name: string;
    gender: string | null;
    date_of_birth: string | null;
    district: string | null;
    city: string | null;
    profile_image: string | null;
    father_name: string | null;
    kulam: string | null;
  };
  account_profile_photo?: string | null;
  matrimony_candidate_photo?: string | null;
  profile_for_self?: boolean;
  message?: string;
  subscription?: MatrimonySubscriptionSummary;
  plans?: MatrimonyPlanCatalogItem[];
};

export type MatrimonyPlanCode = "FREE" | "GOLD" | "PLATINUM";

export type MatrimonySubscriptionSummary = {
  plan: MatrimonyPlanCode;
  planLabel: string;
  expiresAt: string | null;
  quota: { used: number; limit: number; period: string; resetsAt: string };
  features: {
    canOpenOneStar: boolean;
    canOpenTwoStar: boolean;
    whoViewedMe: boolean;
  };
};

export type MatrimonyPlanCatalogItem = {
  plan: MatrimonyPlanCode;
  label: string;
  tagline: string;
  priceInr: number;
  durationMonths: number;
  opensPerMonth: number;
  canOpenOneStar: boolean;
  canOpenTwoStar: boolean;
  whoViewedMe: boolean;
  popular?: boolean;
};

export type MatrimonyFormOptions = {
  income_ranges: { code: string; label: string }[];
  heights: { value: string; label: string }[];
  complexions: { value: string; label: string }[];
  partner_gender: { value: string; label: string }[];
  profile_for?: { value: string; label: string }[];
};

export async function getMatrimonyHub(): Promise<MatrimonyHub> {
  const { data } = await api.get<{ ok: boolean } & MatrimonyHub>("/matrimony/me");
  if (!data?.ok) throw new Error((data as any)?.message ?? "Failed to load matrimony");
  return data;
}

export async function getMatrimonyFormOptions(): Promise<MatrimonyFormOptions> {
  const { data } = await api.get<{ ok: boolean } & MatrimonyFormOptions>("/matrimony/form-options");
  if (!data?.ok) throw new Error("Failed to load form options");
  return {
    income_ranges: data.income_ranges ?? [],
    heights: data.heights ?? [],
    complexions: data.complexions ?? [],
    partner_gender: data.partner_gender ?? [],
    profile_for: data.profile_for ?? []
  };
}

export async function saveMatrimonyDraft(matrimony: MatrimonyProfileData): Promise<MatrimonyHub> {
  const { data } = await api.put<{ ok: boolean } & MatrimonyHub>("/matrimony/draft", { matrimony });
  if (!data?.ok) throw new Error((data as any)?.message ?? "Failed to save draft");
  return data;
}

export async function submitMatrimonyProfile(matrimony?: MatrimonyProfileData): Promise<MatrimonyHub> {
  const { data } = await api.post<{ ok: boolean } & MatrimonyHub>("/matrimony/submit", {
    matrimony: matrimony ?? undefined
  });
  if (!data?.ok) throw new Error((data as any)?.message ?? "Failed to submit");
  return data;
}

export type DiscoverCard = {
  userId: number;
  name: string;
  age: number | null;
  district: string | null;
  occupation: string | null;
  education: string | null;
  kulamLabel: string | null;
  photoUrl: string | null;
  familyManaged: boolean;
  horoscopeAvailable: boolean;
  verified: boolean;
  interestSent: boolean;
  interestReceived: boolean;
  starLevel: 1 | 2;
  starLabel: string;
  matchTags: string[];
  profileOpened: boolean;
  canOpen: boolean;
  openRequiresPlan: "GOLD" | "PLATINUM" | null;
  photoBlurred: boolean;
};

export type ProfileLockedTeaser = {
  userId: number;
  name: string;
  age: number | null;
  district: string | null;
  occupation: string | null;
  starLevel: 1 | 2;
  starLabel: string;
  matchTags: string[];
  openRequiresPlan: "GOLD" | "PLATINUM" | null;
  canOpen: boolean;
};

export type CandidateDetail = DiscoverCard & {
  gender: string | null;
  kulam: string | null;
  height: string | null;
  complexion: string | null;
  aboutMe: string | null;
  rashi: string | null;
  nakshatram: string | null;
  maritalStatus: string | null;
  dosham: string | null;
  interestStatus: string;
  canSendInterest: boolean;
  canRespondInterest: boolean;
  pendingInterestId?: number | null;
  mutualMatch: boolean;
  chatEnabled: boolean;
  contactVisible: boolean;
  horoscopeVisible: boolean;
  saved: boolean;
  blocked: boolean;
  starLevel?: 1 | 2;
  starLabel?: string;
  matchTags?: string[];
  profileOpened?: boolean;
  contactPaymentStatus?: "NONE" | "PENDING" | "PAID";
};

export type MatrimonyCandidateResult =
  | { locked: false; profile: CandidateDetail }
  | { locked: true; teaser: ProfileLockedTeaser };

export type SavedProfileItem = {
  userId: number;
  name: string;
  age: number | null;
  district: string | null;
  photoUrl: string | null;
  savedAt: string;
};

export const MATRIMONY_REPORT_REASONS = [
  { code: "FAKE_PROFILE", label: "Fake or misleading profile" },
  { code: "INAPPROPRIATE_PHOTO", label: "Inappropriate photo" },
  { code: "HARASSMENT", label: "Harassment or abuse" },
  { code: "SPAM", label: "Spam or solicitation" },
  { code: "WRONG_IDENTITY", label: "Wrong person / impersonation" },
  { code: "OTHER", label: "Other" }
] as const;

export type DiscoverFilters = {
  page?: number;
  limit?: number;
  district?: string;
  ageMin?: number;
  ageMax?: number;
  horoscopeOnly?: boolean;
};

export async function discoverMatrimonyProfiles(
  params?: DiscoverFilters
): Promise<{ items: DiscoverCard[]; total: number; page: number; limit: number }> {
  const { data } = await api.get<{ ok: boolean; items: DiscoverCard[]; total: number; page: number; limit: number }>(
    "/matrimony/discover",
    { params }
  );
  if (!data?.ok) throw new Error("Failed to load profiles");
  return data;
}

export async function getMatrimonyCandidate(userId: number): Promise<MatrimonyCandidateResult> {
  try {
    const { data } = await api.get<{ ok: boolean } & CandidateDetail>(`/matrimony/candidates/${userId}`);
    if (!data?.ok) throw new Error("Failed to load profile");
    const { ok: _ok, ...profile } = data;
    return { locked: false, profile: profile as CandidateDetail };
  } catch (e: unknown) {
    const err = e as { response?: { status?: number; data?: { code?: string; teaser?: ProfileLockedTeaser } } };
    if (err.response?.status === 403 && err.response.data?.code === "PROFILE_LOCKED" && err.response.data.teaser) {
      return { locked: true, teaser: err.response.data.teaser };
    }
    throw e instanceof Error ? e : new Error("Failed to load profile");
  }
}

export async function openMatrimonyProfile(userId: number): Promise<CandidateDetail> {
  const { data } = await api.post<{ ok: boolean } & CandidateDetail>(`/matrimony/candidates/${userId}/open`);
  if (!data?.ok) throw new Error((data as { message?: string })?.message ?? "Could not open profile");
  const { ok: _ok, ...profile } = data;
  return profile as CandidateDetail;
}

export async function subscribeMatrimonyPlan(plan: "GOLD" | "PLATINUM", durationMonths = 6) {
  const { data } = await api.post<{ ok: boolean; subscription: MatrimonySubscriptionSummary; message?: string }>(
    "/matrimony/subscription/subscribe",
    { plan, durationMonths }
  );
  if (!data?.ok) throw new Error("Subscription failed");
  return data;
}

export async function startMatrimonyContactPayment(otherUserId: number) {
  const { data } = await api.post<{
    ok: boolean;
    payment: { id: number; amountPaise: number; amountInr: number; status: string };
  }>(`/matrimony/matches/${otherUserId}/contact/pay`);
  if (!data?.ok) throw new Error("Could not start payment");
  return data.payment;
}

export async function confirmMatrimonyContactPayment(otherUserId: number) {
  const { data } = await api.post<{ ok: boolean; mobile: string | null; message?: string }>(
    `/matrimony/matches/${otherUserId}/contact/confirm`
  );
  if (!data?.ok) throw new Error("Payment confirmation failed");
  return data;
}

export async function getMatrimonyProfileViews() {
  const { data } = await api.get<{
    ok: boolean;
    items: {
      viewerId: number;
      name: string;
      age: number | null;
      district: string | null;
      viewedAt: string;
      starLabel: string;
    }[];
  }>("/matrimony/views");
  if (!data?.ok) throw new Error("Failed to load views");
  return data.items ?? [];
}

export async function sendMatrimonyInterest(toUserId: number, introMessage?: string) {
  const { data } = await api.post<{ ok: boolean; mutualMatch: boolean }>("/matrimony/interests", {
    toUserId,
    introMessage
  });
  if (!data?.ok) throw new Error((data as any)?.message ?? "Failed to send interest");
  return data;
}

export async function respondMatrimonyInterest(interestId: number, action: "ACCEPT" | "DECLINE") {
  const { data } = await api.post<{ ok: boolean; mutualMatch: boolean }>(
    `/matrimony/interests/${interestId}/respond`,
    { action }
  );
  if (!data?.ok) throw new Error((data as any)?.message ?? "Failed to respond");
  return data;
}

export async function getMatrimonyInterestsSent() {
  const { data } = await api.get<{ ok: boolean; items: unknown[] }>("/matrimony/interests/sent");
  if (!data?.ok) throw new Error("Failed to load");
  return data.items ?? [];
}

export async function getMatrimonyInterestsReceived() {
  const { data } = await api.get<{ ok: boolean; items: unknown[] }>("/matrimony/interests/received");
  if (!data?.ok) throw new Error("Failed to load");
  return data.items ?? [];
}

export async function getMatrimonyMatches() {
  const { data } = await api.get<{ ok: boolean; items: unknown[] }>("/matrimony/matches");
  if (!data?.ok) throw new Error("Failed to load matches");
  return data.items ?? [];
}

export async function requestMatrimonyHoroscope(otherUserId: number) {
  const { data } = await api.post<{ ok: boolean; requested: boolean }>(
    `/matrimony/matches/${otherUserId}/horoscope/request`
  );
  if (!data?.ok) throw new Error("Could not request horoscope");
  return data;
}

export async function shareMatrimonyHoroscope(otherUserId: number) {
  const { data } = await api.post<{ ok: boolean; shared: boolean }>(
    `/matrimony/matches/${otherUserId}/horoscope/share`
  );
  if (!data?.ok) throw new Error((data as any)?.message ?? "Could not share horoscope");
  return data;
}

export async function getMatrimonyHoroscope(otherUserId: number) {
  const { data } = await api.get<{ ok: boolean; url: string | null; available: boolean }>(
    `/matrimony/matches/${otherUserId}/horoscope`
  );
  if (!data?.ok) throw new Error("Horoscope not available");
  return data;
}

export async function revealMatrimonyContact(otherUserId: number) {
  const { data } = await api.post<{ ok: boolean; mobile: string | null }>(
    `/matrimony/matches/${otherUserId}/contact`
  );
  if (!data?.ok) throw new Error("Contact not available");
  return data;
}

export async function getMatrimonySavedProfiles() {
  const { data } = await api.get<{ ok: boolean; items: SavedProfileItem[] }>("/matrimony/saved");
  if (!data?.ok) throw new Error("Failed to load saved profiles");
  return data.items ?? [];
}

export async function saveMatrimonyProfile(userId: number) {
  const { data } = await api.post<{ ok: boolean; saved: boolean }>(`/matrimony/saved/${userId}`);
  if (!data?.ok) throw new Error("Could not save profile");
  return data;
}

export async function unsaveMatrimonyProfile(userId: number) {
  const { data } = await api.delete<{ ok: boolean }>(`/matrimony/saved/${userId}`);
  if (!data?.ok) throw new Error("Could not remove saved profile");
}

export async function blockMatrimonyProfile(userId: number) {
  const { data } = await api.post<{ ok: boolean; blocked: boolean }>(`/matrimony/blocks/${userId}`);
  if (!data?.ok) throw new Error("Could not block profile");
  return data;
}

export async function reportMatrimonyProfile(
  userId: number,
  reasonCode: string,
  details?: string
) {
  const { data } = await api.post<{ ok: boolean; id: number; status: string }>(
    `/matrimony/reports/${userId}`,
    { reasonCode, details }
  );
  if (!data?.ok) throw new Error((data as any)?.message ?? "Could not submit report");
  return data;
}
