/**
 * Shared mobile helpers for registration / Google complete profile.
 * Mirrors backend normalizeMobile (India 10-digit, starts with 6–9).
 */

export function digitsOnly(raw: string | null | undefined): string {
  return String(raw ?? "").replace(/\D/g, "");
}

export function normalizeMobile(raw: string | null | undefined): string | null {
  let d = digitsOnly(raw);
  if (!d) return null;
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 13 && d.startsWith("091")) d = d.slice(3);
  if (d.length !== 10) return null;
  if (!/^[6-9]\d{9}$/.test(d)) return null;
  return d;
}

export function isValidUsername(raw: string): boolean {
  const u = raw.trim().toLowerCase();
  return /^[a-z][a-z0-9_]{2,29}$/.test(u);
}
