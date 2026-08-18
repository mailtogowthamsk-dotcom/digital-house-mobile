/** Feed-safe copy helpers so long contact dumps never explode the home card. */

const IN_PHONE = /(?:\+91[\s-]*)?[6-9]\d(?:[\s-]?\d){8}/g;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const URL_RE = /https?:\/\/[^\s]+/gi;

function uniqueKeepOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const key = v.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(v.trim());
  }
  return out;
}

export function extractPhoneNumbers(text: string): string[] {
  const matches = String(text || "").match(IN_PHONE) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of matches) {
    const digits = raw.replace(/\D/g, "");
    const national =
      digits.length >= 12 && digits.startsWith("91") ? digits.slice(-10) : digits.slice(-10);
    if (national.length !== 10 || seen.has(national)) continue;
    seen.add(national);
    out.push(raw.trim());
  }
  return out;
}

export function extractEmails(text: string): string[] {
  return uniqueKeepOrder(String(text || "").match(EMAIL_RE) ?? []);
}

export function extractHttpUrls(text: string): string[] {
  return uniqueKeepOrder(String(text || "").match(URL_RE) ?? []);
}

export function looksLikeContactDump(description: string): boolean {
  const lines = String(description || "")
    .split(/\n/)
    .filter((l) => l.trim()).length;
  return extractPhoneNumbers(description).length >= 2 || lines >= 4;
}

/** One-line subtitle for the feed card. Never renders 50 contact lines. */
export function advertisementFeedSubtitle(description: string): string {
  const compact = String(description || "").replace(/\s+/g, " ").trim();
  if (!compact) return "";
  const phones = extractPhoneNumbers(description);
  if (looksLikeContactDump(description)) {
    if (phones.length === 1) return "1 contact number · tap to view";
    if (phones.length > 1) return `${phones.length} contact numbers · tap to view`;
    return "More details · tap to view";
  }
  return compact;
}

export function telHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `tel:+91${digits}`;
  if (digits.length >= 12 && digits.startsWith("91")) return `tel:+${digits}`;
  return `tel:+${digits}`;
}

export function formatIndianPhone(phone: string | null | undefined): string {
  const digits = String(phone || "").replace(/\D/g, "");
  const national =
    digits.length >= 12 && digits.startsWith("91") ? digits.slice(-10) : digits.slice(-10);
  if (national.length !== 10) return String(phone || "").trim();
  return `+91 ${national.slice(0, 5)} ${national.slice(5)}`;
}
