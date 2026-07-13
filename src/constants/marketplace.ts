/** Marketplace Phase 1 — mobile constants (aligned with backend). */

export const MARKETPLACE_INTENTS = [
  { value: "SALE", label: "For sale" },
  { value: "EXCHANGE", label: "Exchange" },
  { value: "FREE", label: "Free / giveaway" }
] as const;

export const MARKETPLACE_CONDITIONS = [
  { value: "NEW", label: "New" },
  { value: "LIKE_NEW", label: "Like new" },
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
  { value: "FOR_PARTS", label: "For parts" }
] as const;

export const MARKETPLACE_CATEGORIES = [
  { value: "MOBILES", label: "Mobiles" },
  { value: "ELECTRONICS", label: "Electronics" },
  { value: "VEHICLES", label: "Vehicles" },
  { value: "PROPERTY", label: "Property" },
  { value: "FURNITURE", label: "Furniture" },
  { value: "HOME_APPLIANCES", label: "Home appliances" },
  { value: "FASHION", label: "Fashion" },
  { value: "BOOKS", label: "Books" },
  { value: "SPORTS_HOBBIES", label: "Sports & hobbies" },
  { value: "KIDS_BABY", label: "Kids & baby" },
  { value: "OTHERS", label: "Others" }
] as const;

export function formatMarketplacePrice(
  intent: string | null | undefined,
  price: number | null | undefined,
  negotiable?: boolean
): string | null {
  if (intent === "FREE") return "Free";
  if (intent === "EXCHANGE") return "Exchange";
  if (price == null) return null;
  const base = `₹${price.toLocaleString("en-IN")}`;
  return negotiable ? `${base} · Negotiable` : base;
}

export function formatMarketplaceCategory(value: string | null | undefined): string | null {
  if (!value) return null;
  return MARKETPLACE_CATEGORIES.find((c) => c.value === value)?.label ?? value.replace(/_/g, " ");
}

export function formatMarketplaceCondition(value: string | null | undefined): string | null {
  if (!value) return null;
  return MARKETPLACE_CONDITIONS.find((c) => c.value === value)?.label ?? value.replace(/_/g, " ");
}

export function formatMarketplaceStatus(value: string | null | undefined): string {
  switch (value) {
    case "LIVE":
      return "Live";
    case "PENDING_REVIEW":
      return "Pending review";
    case "CHANGES_REQUESTED":
      return "Changes requested";
    case "REJECTED":
      return "Rejected";
    case "SOLD":
      return "Sold";
    case "HIDDEN":
      return "Hidden";
    case "EXPIRED":
      return "Expired";
    case "ARCHIVED":
      return "Archived";
    default:
      return value ?? "Unknown";
  }
}

export const MARKETPLACE_REPORT_REASONS = [
  "Spam",
  "Duplicate",
  "Wrong Category",
  "Fake Listing",
  "Illegal Item",
  "Already Sold",
  "Other"
] as const;

/** Max photos per listing (aligned with backend). */
export const MARKETPLACE_MAX_PHOTOS = 6;

export function formatMarketplaceExpiry(expiresAt?: string | null): string | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(ms)) return null;
  if (ms <= 0) return "Expired";
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Expires today";
  if (days === 1) return "1 day left";
  if (days <= 7) return `${days} days left`;
  return null;
}
