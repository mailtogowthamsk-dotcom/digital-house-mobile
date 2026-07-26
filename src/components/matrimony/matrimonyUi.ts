import type { DiscoverCard } from "../../api/matrimony.api";

/** Stable list keys when labels may repeat (e.g. Verified in chips + kulam label). */
export function dedupeLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const l of labels) {
    const t = l.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/** Chip labels for browse / profile cards (mockup: Same District, Horoscope, etc.) */
export function buildDiscoverChips(
  item: Pick<
    DiscoverCard,
    "district" | "horoscopeAvailable" | "verified" | "kulamLabel" | "familyManaged"
  >,
  viewerDistrict?: string | null
): string[] {
  const chips: string[] = [];
  if (
    viewerDistrict &&
    item.district &&
    viewerDistrict.trim().toLowerCase() === item.district.trim().toLowerCase()
  ) {
    chips.push("Same district");
  }
  if (item.horoscopeAvailable) chips.push("Horoscope");
  if (item.verified) chips.push("Verified");
  if (item.kulamLabel) chips.push(item.kulamLabel);
  if (item.familyManaged) chips.push("Family managed");
  return dedupeLabels(chips);
}

export type QuickBrowseFilter = "all" | "horoscope" | "myDistrict";

export function interestStatusLabel(status: string): { label: string; tone: "pending" | "ok" | "muted" } {
  switch (status) {
    case "SENT_PENDING":
      return { label: "Interest sent", tone: "pending" };
    case "SENT_ACCEPTED":
      return { label: "They accepted", tone: "ok" };
    case "RECEIVED_PENDING":
      return { label: "Respond to interest", tone: "pending" };
    case "MATCHED":
      return { label: "Matched", tone: "ok" };
    default:
      return { label: "No interest yet", tone: "muted" };
  }
}

const INCOME_LABELS: Record<string, string> = {
  NOT_EMPLOYED: "Not employed / Student",
  BELOW_2L: "Below ₹2 Lakhs",
  LAKHS_2_5: "₹2 – 5 Lakhs",
  LAKHS_5_10: "₹5 – 10 Lakhs",
  LAKHS_10_15: "₹10 – 15 Lakhs",
  LAKHS_15_25: "₹15 – 25 Lakhs",
  LAKHS_25_50: "₹25 – 50 Lakhs",
  ABOVE_50L: "Above ₹50 Lakhs",
  PREFER_NOT_SAY: "Prefer not to say"
};

export function formatMatrimonyIncome(code: string | null | undefined): string | null {
  if (!code?.trim()) return null;
  return INCOME_LABELS[code] ?? code;
}

export function formatSiblingCounts(
  brothers: number | null | undefined,
  sisters: number | null | undefined
): string | null {
  if (brothers == null && sisters == null) return null;
  const b = brothers ?? 0;
  const s = sisters ?? 0;
  if (b === 0 && s === 0) return "No siblings";
  const parts: string[] = [];
  if (b > 0) parts.push(`${b} brother${b === 1 ? "" : "s"}`);
  if (s > 0) parts.push(`${s} sister${s === 1 ? "" : "s"}`);
  return parts.join(", ");
}
