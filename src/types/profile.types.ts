/**
 * Profile section types and dropdown options for Edit Profile.
 * Matches backend PUT /api/profile/:section payloads (basic = snake_case, others = camelCase).
 */

export const PROFILE_SECTIONS = ["basic", "community", "personal", "matrimony", "business", "family"] as const;
export type ProfileSectionId = (typeof PROFILE_SECTIONS)[number];

// —— Basic (API snake_case) ——
export type BasicSectionForm = {
  full_name: string;
  date_of_birth: string | null;
  email: string;
  mobile: string | null;
  gender: string | null;
  native_district: string | null;
  role: string | null;
};

// —— Community, Personal, Matrimony, Business, Family (API camelCase) ——
export type CommunitySectionForm = {
  kulam: string | null;
  kulaDeivam: string | null;
  nativeVillage: string | null;
  nativeTaluk: string | null;
};

export type PersonalSectionForm = {
  currentLocation: string | null;
  occupation: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  hobbies: string | null;
  fatherName: string | null;
  maritalStatus: string | null;
};

export type MatrimonySectionForm = {
  matrimonyProfileActive: boolean;
  lookingFor: string | null;
  education: string | null;
  maritalStatus: string | null;
  rashi: string | null;
  nakshatram: string | null;
  dosham: string | null;
  familyType: string | null;
  familyStatus: string | null;
  motherName: string | null;
  fatherOccupation: string | null;
  numberOfSiblings: number | null;
  partnerPreferences: string | null;
  horoscopeDocumentUrl: string | null;
};

export type BusinessSectionForm = {
  businessProfileActive: boolean;
  businessName: string | null;
  businessType: string | null;
  businessDescription: string | null;
  businessAddress: string | null;
  businessPhone: string | null;
  businessWebsite: string | null;
};

export type FamilySectionForm = {
  familyMemberId1: number | null;
  familyMemberId2: number | null;
  familyMemberId3: number | null;
  familyMemberId4: number | null;
  familyMemberId5: number | null;
};

// —— Dropdown options (label, value) ——
export const GENDER_OPTIONS: { label: string; value: string }[] = [
  { label: "Male", value: "Male" },
  { label: "Female", value: "Female" },
  { label: "Other", value: "Other" }
];

export const ROLE_OPTIONS: { label: string; value: string }[] = [
  { label: "User", value: "USER" },
  { label: "Admin", value: "ADMIN" },
  { label: "Moderator", value: "MODERATOR" }
];

export const MARITAL_STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: "Single", value: "Single" },
  { label: "Married", value: "Married" },
  { label: "Widowed", value: "Widowed" },
  { label: "Divorced", value: "Divorced" },
  { label: "Prefer not to say", value: "Prefer not to say" }
];

export const LOOKING_FOR_OPTIONS: { label: string; value: string }[] = [
  { label: "Self", value: "SELF" },
  { label: "Son", value: "SON" },
  { label: "Daughter", value: "DAUGHTER" }
];

export const RASHI_OPTIONS: { label: string; value: string }[] = [
  "Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya",
  "Tula", "Vrishchika", "Dhanu", "Makara", "Kumbha", "Meena"
].map((r) => ({ label: r, value: r }));

export const NAKSHATRAM_OPTIONS: { label: string; value: string }[] = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu",
  "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta",
  "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha",
  "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada",
  "Uttara Bhadrapada", "Revati"
].map((n) => ({ label: n, value: n }));

export const DOSHAM_OPTIONS: { label: string; value: string }[] = [
  { label: "Yes", value: "Yes" },
  { label: "No", value: "No" },
  { label: "Not Sure", value: "Not Sure" }
];

export const FAMILY_TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: "Joint", value: "Joint" },
  { label: "Nuclear", value: "Nuclear" }
];

export const FAMILY_STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: "Middle class", value: "Middle class" },
  { label: "Upper middle class", value: "Upper middle class" },
  { label: "Affluent", value: "Affluent" },
  { label: "Prefer not to say", value: "Prefer not to say" }
];

export const BUSINESS_TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: "Retail", value: "Retail" },
  { label: "Wholesale", value: "Wholesale" },
  { label: "Services", value: "Services" },
  { label: "Manufacturing", value: "Manufacturing" },
  { label: "Agriculture", value: "Agriculture" },
  { label: "Technology", value: "Technology" },
  { label: "Other", value: "Other" }
];
