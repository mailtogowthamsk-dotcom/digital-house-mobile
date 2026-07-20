/** Helping Hands — mobile constants (aligned with backend). */

export const HELP_CATEGORIES = [
  { value: "BLOOD_DONATION", label: "Blood Donation", icon: "water-outline" as const },
  { value: "MEDICAL", label: "Medical Help", icon: "medkit-outline" as const },
  { value: "EDUCATION", label: "Education", icon: "school-outline" as const },
  { value: "FOOD", label: "Food", icon: "restaurant-outline" as const },
  { value: "FINANCIAL", label: "Financial Help", icon: "cash-outline" as const },
  { value: "VOLUNTEER", label: "Volunteer", icon: "people-outline" as const },
  { value: "OTHERS", label: "Others", icon: "ellipsis-horizontal-outline" as const }
] as const;

export const HELP_URGENCIES = [
  { value: "NORMAL", label: "Normal" },
  { value: "URGENT", label: "Urgent" },
  { value: "CRITICAL", label: "Critical" }
] as const;

export const HELP_MAX_PHOTOS = 6;

/** Soft palette for lifecycle badges — not bright/distracting. */
export type HelpLifecycleTone = {
  label: string;
  bg: string;
  text: string;
};

export function formatHelpCategory(value: string | null | undefined): string {
  if (!value) return "Help";
  return HELP_CATEGORIES.find((c) => c.value === value)?.label ?? value.replace(/_/g, " ");
}

export function formatHelpUrgency(value: string | null | undefined): string {
  if (!value) return "Normal";
  return HELP_URGENCIES.find((u) => u.value === value)?.label ?? value;
}

export function formatHelpStatus(value: string | null | undefined): string {
  switch (value) {
    case "OPEN":
      return "Active";
    case "IN_PROGRESS":
      return "In Progress";
    case "COMPLETED":
      return "Resolved";
    case "CANCELLED":
      return "Cancelled";
    case "EXPIRED":
      return "Expired";
    default:
      return value ?? "Active";
  }
}

/**
 * Lifecycle badge for UI: Active / Expiring Soon / Expired / Resolved.
 * Prefer lifecycle tone over raw urgency colors on detail screens.
 */
export function helpLifecycleBadge(
  status: string | null | undefined,
  expiresAt?: string | null,
  now: Date = new Date()
): HelpLifecycleTone {
  if (status === "COMPLETED") {
    return { label: "Resolved", bg: "#ECFDF5", text: "#047857" };
  }
  if (status === "EXPIRED") {
    return { label: "Expired", bg: "#F3F4F6", text: "#6B7280" };
  }
  if (status === "CANCELLED") {
    return { label: "Cancelled", bg: "#F3F4F6", text: "#6B7280" };
  }

  if (expiresAt) {
    const ms = new Date(expiresAt).getTime() - now.getTime();
    if (ms <= 0) {
      return { label: "Expired", bg: "#F3F4F6", text: "#6B7280" };
    }
    if (ms <= 60 * 60 * 1000) {
      return { label: "Expiring Soon", bg: "#FFFBEB", text: "#92400E" };
    }
  }

  if (status === "IN_PROGRESS") {
    return { label: "In Progress", bg: "#EFF6FF", text: "#1D4ED8" };
  }
  return { label: "Active", bg: "#ECFDF5", text: "#047857" };
}

export function urgencyBadgeColor(value: string | null | undefined): {
  bg: string;
  text: string;
} {
  switch (value) {
    case "CRITICAL":
      return { bg: "#FEE2E2", text: "#B91C1C" };
    case "URGENT":
      return { bg: "#FFEDD5", text: "#C2410C" };
    default:
      return { bg: "#ECFDF5", text: "#047857" };
  }
}

export function formatHelpExpiresIn(expiresAt: string | null | undefined, now = new Date()): string | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - now.getTime();
  if (ms <= 0) return "Expired";
  const hours = Math.ceil(ms / (60 * 60 * 1000));
  if (hours < 24) return `Expires in ${hours}h`;
  const days = Math.ceil(hours / 24);
  return `Expires in ${days}d`;
}
