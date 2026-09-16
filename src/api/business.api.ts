import { api } from "./client";

export const BUSINESS_ENQUIRY_TYPES = [
  "PRODUCT_SERVICE",
  "PRICE",
  "AVAILABILITY",
  "PARTNERSHIP",
  "WHOLESALE",
  "OTHER"
] as const;

export type BusinessEnquiryType = (typeof BUSINESS_ENQUIRY_TYPES)[number];

export const BUSINESS_ENQUIRY_TYPE_LABELS: Record<BusinessEnquiryType, string> = {
  PRODUCT_SERVICE: "Product / Service",
  PRICE: "Price Enquiry",
  AVAILABILITY: "Availability",
  PARTNERSHIP: "Partnership",
  WHOLESALE: "Wholesale",
  OTHER: "Other"
};

export type BusinessEnquiryResult = {
  messageId: number;
  otherUserId: number;
  body: string;
  createdAt: string;
};

export async function submitBusinessEnquiry(input: {
  businessOwnerId: number;
  enquiryType: BusinessEnquiryType;
  message: string;
  clientId?: string;
}): Promise<BusinessEnquiryResult> {
  const res = await api.post<{ ok: true; enquiry: BusinessEnquiryResult }>("/business/enquiries", {
    businessOwnerId: input.businessOwnerId,
    enquiryType: input.enquiryType,
    message: input.message,
    clientId: input.clientId ?? null
  });
  return res.data.enquiry;
}

export const BUSINESS_BENEFIT_TYPES = [
  "PERCENTAGE_DISCOUNT",
  "FIXED_DISCOUNT",
  "SPECIAL_PRICE",
  "FREE_SERVICE",
  "OTHER"
] as const;

export type BusinessBenefitType = (typeof BUSINESS_BENEFIT_TYPES)[number];

export const BUSINESS_BENEFIT_TYPE_LABELS: Record<BusinessBenefitType, string> = {
  PERCENTAGE_DISCOUNT: "Percentage Discount",
  FIXED_DISCOUNT: "Fixed Discount",
  SPECIAL_PRICE: "Special Price",
  FREE_SERVICE: "Free Service",
  OTHER: "Other"
};

export type OwnerBenefit = {
  id: number;
  title: string;
  description: string;
  benefitType: string;
  value: string;
  validFrom: string | null;
  validUntil: string | null;
  terms: string | null;
  usageLimit: number | null;
  claimCount: number;
  remainingClaims: number | null;
  status: "PENDING" | "ACTIVE" | "REJECTED" | "DISABLED" | "EXPIRED" | string;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BenefitClaim = {
  id: number;
  benefitId: number;
  claimCode: string;
  status: "CLAIMED" | "USED" | "CANCELLED" | "EXPIRED" | string;
  claimedAt: string;
  usedAt: string | null;
  expiresAt: string | null;
  benefitTitle?: string;
  benefitValue?: string;
  businessName?: string;
  memberName?: string;
  terms?: string | null;
  validUntil?: string | null;
  businessAvailable?: boolean;
};

export type PublicBenefit = {
  id: number;
  businessOwnerId: number;
  businessName: string;
  title: string;
  description: string;
  benefitType: string;
  value: string;
  validFrom: string | null;
  validUntil: string | null;
  terms: string | null;
  remainingClaims: number | null;
  myClaim: BenefitClaim | null;
};

export type BenefitInput = {
  title: string;
  description: string;
  benefitType: BusinessBenefitType;
  value: string;
  validFrom?: string | null;
  validUntil?: string | null;
  terms?: string | null;
  usageLimit?: number | null;
};

export async function createBusinessBenefit(input: BenefitInput): Promise<OwnerBenefit> {
  const res = await api.post<{ ok: true; benefit: OwnerBenefit }>("/business/benefits", input);
  return res.data.benefit;
}

export async function listMyBusinessBenefits(): Promise<OwnerBenefit[]> {
  const res = await api.get<{ ok: true; benefits: OwnerBenefit[] }>("/business/benefits/mine");
  return res.data.benefits ?? [];
}

export async function getBusinessBenefit(
  id: number
): Promise<{ benefit: OwnerBenefit | PublicBenefit; scope: "owner" | "public" }> {
  const res = await api.get<{
    ok: true;
    benefit: OwnerBenefit | PublicBenefit;
    scope: "owner" | "public";
  }>(`/business/benefits/${id}`);
  return { benefit: res.data.benefit, scope: res.data.scope };
}

export async function updateBusinessBenefit(id: number, input: BenefitInput): Promise<OwnerBenefit> {
  const res = await api.put<{ ok: true; benefit: OwnerBenefit }>(`/business/benefits/${id}`, input);
  return res.data.benefit;
}

export async function disableBusinessBenefit(id: number): Promise<OwnerBenefit> {
  const res = await api.patch<{ ok: true; benefit: OwnerBenefit }>(
    `/business/benefits/${id}/disable`
  );
  return res.data.benefit;
}

export async function listAvailableBenefits(): Promise<PublicBenefit[]> {
  const res = await api.get<{ ok: true; benefits: PublicBenefit[] }>("/business/benefits/available");
  return res.data.benefits ?? [];
}

export async function listOwnerPublicBenefits(ownerUserId: number): Promise<PublicBenefit[]> {
  const res = await api.get<{ ok: true; benefits: PublicBenefit[] }>(
    `/business/benefits/owner/${ownerUserId}`
  );
  return res.data.benefits ?? [];
}

export async function claimBusinessBenefit(id: number): Promise<BenefitClaim> {
  const res = await api.post<{ ok: true; claim: BenefitClaim }>(`/business/benefits/${id}/claim`);
  return res.data.claim;
}

export async function listMyBenefitClaims(): Promise<BenefitClaim[]> {
  const res = await api.get<{ ok: true; claims: BenefitClaim[] }>("/business/benefits/claims/mine");
  return res.data.claims ?? [];
}

export async function getBenefitClaim(claimId: number): Promise<BenefitClaim> {
  const res = await api.get<{ ok: true; claim: BenefitClaim }>(
    `/business/benefits/claims/${claimId}`
  );
  return res.data.claim;
}

export async function lookupBenefitClaimCode(claimCode: string): Promise<BenefitClaim> {
  const res = await api.post<{ ok: true; claim: BenefitClaim }>("/business/benefits/claims/lookup", {
    claimCode
  });
  return res.data.claim;
}

export async function markBenefitClaimUsed(claimCode: string): Promise<BenefitClaim> {
  const res = await api.post<{ ok: true; claim: BenefitClaim }>(
    "/business/benefits/claims/mark-used",
    { claimCode }
  );
  return res.data.claim;
}

/** @deprecated Prefer lookupBenefitClaimCode (preview) + markBenefitClaimUsed */
export async function verifyBenefitClaimCode(claimCode: string): Promise<BenefitClaim> {
  return lookupBenefitClaimCode(claimCode);
}
