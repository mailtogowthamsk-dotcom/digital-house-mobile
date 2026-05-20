import type { DiscoverCard } from "../../api/matrimony.api";

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
  return chips;
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
      return { label: "Mutual match", tone: "ok" };
    default:
      return { label: "No interest yet", tone: "muted" };
  }
}
