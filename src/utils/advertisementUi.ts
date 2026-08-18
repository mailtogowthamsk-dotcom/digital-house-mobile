import type { ThemeColors } from "../theme/ThemeContext";

/** Keep in sync with backend/src/constants/advertisement.constants.ts */
export const AD_TITLE_MIN = 3;
export const AD_TITLE_MAX = 80;
export const AD_UNTITLED_DRAFT_TITLE = "Untitled draft";
export const AD_DESCRIPTION_MIN = 10;
export const AD_DESCRIPTION_MAX = 8000;
export const AD_SHORT_DESCRIPTION_MAX = 280;
export const AD_BUSINESS_NAME_MIN = 2;
export const AD_BUSINESS_NAME_MAX = 120;
export const AD_CTA_MIN = 2;
export const AD_CTA_MAX = 40;

export const AD_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PAYMENT_PENDING: "Payment pending",
  PAID: "Paid",
  PENDING_REVIEW: "Pending review",
  APPROVED: "Approved",
  SCHEDULED: "Scheduled",
  ACTIVE: "Active",
  PAUSED: "Paused",
  EXPIRED: "Expired",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled"
};

export const AD_TYPE_LABELS: Record<string, string> = {
  IMAGE_BANNER: "Image banner",
  VIDEO: "Video",
  PROMOTIONAL_CARD: "Promotional card",
  SPONSORED_CONTENT: "Sponsored content"
};

/** Keep in sync with backend ADVERTISEMENT_BUSINESS_CATEGORIES. */
export const AD_BUSINESS_CATEGORY_LABELS: Record<string, string> = {
  RETAIL: "Retail / Shop",
  SERVICES: "Services",
  FOOD: "Food & Restaurant",
  EDUCATION: "Education",
  HEALTH: "Health & Wellness",
  REAL_ESTATE: "Real Estate",
  JOBS: "Jobs & Hiring",
  EVENTS: "Events",
  VEHICLES: "Vehicles",
  OTHER: "Other"
};

export function adBusinessCategoryLabel(code: string | null | undefined): string | null {
  const raw = String(code || "").trim();
  if (!raw) return null;
  return AD_BUSINESS_CATEGORY_LABELS[raw.toUpperCase()] || raw.replace(/_/g, " ");
}

export function adStatusLabel(status: string): string {
  return AD_STATUS_LABELS[status] || status.replace(/_/g, " ");
}

export function adTypeLabel(typeCode: string, catalogLabel?: string): string {
  return catalogLabel || AD_TYPE_LABELS[typeCode] || typeCode.replace(/_/g, " ");
}

export function adStatusColor(status: string, colors: ThemeColors): string {
  switch (status) {
    case "DRAFT":
      return colors.textSecondary;
    case "PAYMENT_PENDING":
    case "PAID":
    case "PENDING_REVIEW":
    case "APPROVED":
    case "SCHEDULED":
      return colors.statusPending;
    case "ACTIVE":
      return colors.statusApproved;
    case "PAUSED":
      return colors.warning;
    case "EXPIRED":
    case "CANCELLED":
      return colors.textMuted;
    case "REJECTED":
      return colors.statusRejected;
    default:
      return colors.textSecondary;
  }
}

export function isUnpaidDraft(status: string): boolean {
  return status === "DRAFT";
}

export function isContinuableDraft(status: string): boolean {
  return status === "DRAFT";
}

export function isCancellableAdvertisement(status: string): boolean {
  return [
    "PAYMENT_PENDING",
    "PAID",
    "PENDING_REVIEW",
    "APPROVED",
    "SCHEDULED",
    "ACTIVE",
    "PAUSED"
  ].includes(status);
}

export function isAdvertiserDeletable(status: string): boolean {
  return isUnpaidDraft(status) || isCancellableAdvertisement(status);
}

export function isEditableAdvertisement(status: string): boolean {
  return status === "DRAFT" || status === "PAYMENT_PENDING" || status === "ACTIVE";
}

export function isLiveCreativeEditable(status: string): boolean {
  return status === "ACTIVE";
}

export function advertiserEditActionLabel(status: string): string | null {
  if (status === "DRAFT") return "Continue Draft";
  if (status === "PAYMENT_PENDING") return "Continue payment";
  if (status === "ACTIVE") return "Edit";
  return null;
}

/** Resume the create wizard at the first incomplete step. Duration/pay is never auto-opened for drafts. */
export function inferAdvertisementDraftStep(ad: {
  typeCode?: string | null;
  mediaFileId?: number | null;
  title?: string | null;
  businessName?: string | null;
  description?: string | null;
}): number {
  if (!ad.typeCode) return 0;
  if (!ad.mediaFileId) return 1;
  const title = (ad.title || "").trim();
  const untitled = !title || title === AD_UNTITLED_DRAFT_TITLE;
  const description = (ad.description || "").trim();
  const business = (ad.businessName || "").trim();
  if (untitled || business.length < AD_BUSINESS_NAME_MIN || description.length < AD_DESCRIPTION_MIN) {
    return 2;
  }
  return 3;
}

export function shouldShowAnalytics(status: string): boolean {
  return status !== "DRAFT" && status !== "PAYMENT_PENDING";
}

export function invoiceAvailableFromDetail(detail: {
  invoice?: unknown;
  advertisement?: { status?: string; paymentOrderId?: number | null };
}): boolean {
  if (!detail.invoice) return false;
  const status = detail.advertisement?.status;
  if (status === "DRAFT" || status === "PAYMENT_PENDING") return false;
  return true;
}

export function formatInrFromPaise(paise: number | null | undefined): string {
  if (paise == null) return "—";
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export function pickerMediaKind(catalogMediaKind: string | undefined, typeCode: string): "image" | "video" | "either" {
  if (catalogMediaKind === "image" || catalogMediaKind === "video" || catalogMediaKind === "either") {
    return catalogMediaKind;
  }
  if (typeCode === "VIDEO") return "video";
  if (typeCode === "IMAGE_BANNER") return "image";
  return "either";
}

export function mediaMatchesPickerKind(
  fileKind: "image" | "video" | null,
  pickerKind: "image" | "video" | "either"
): boolean {
  if (!fileKind) return true;
  if (pickerKind === "either") return true;
  return fileKind === pickerKind;
}

/** Normalize a public http(s) URL for opening from an advertisement CTA. */
export function normalizeAdvertisementUrl(raw: string | null | undefined): string | null {
  const value = String(raw || "").trim();
  if (!value) return null;
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (!parsed.hostname || !parsed.hostname.includes(".")) return null;
    if (/^\d+$/.test(parsed.hostname.replace(/\./g, ""))) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** True when RN Image can render this URI (not a raw video file). */
export function isRasterPreviewUri(uri: string | null | undefined, kind?: string | null): boolean {
  if (!uri?.trim()) return false;
  const u = uri.trim();
  if (/\.(mp4|mov|m4v|webm)(\?|$)/i.test(u)) return false;
  if (kind === "video" && /^https?:\/\//i.test(u)) {
    if (/poster|_thumb|_md\.webp|_thumb\.webp/i.test(u)) return true;
    if (/\/videos\//i.test(u) && !/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(u)) return false;
  }
  return true;
}
