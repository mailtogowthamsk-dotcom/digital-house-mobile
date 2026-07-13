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
      return "Pending";
    case "IN_PROGRESS":
      return "In Progress";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    default:
      return value ?? "Pending";
  }
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
