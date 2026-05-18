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
