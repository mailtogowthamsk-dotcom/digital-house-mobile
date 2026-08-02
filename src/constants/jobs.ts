export const JOB_EMPLOYMENT_TYPES = [
  { value: "FULL_TIME", label: "Full Time" },
  { value: "PART_TIME", label: "Part Time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "INTERNSHIP", label: "Internship" },
  { value: "TEMPORARY", label: "Temporary" }
] as const;

export const JOB_WORK_MODES = [
  { value: "ON_SITE", label: "On-site" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "REMOTE", label: "Remote" }
] as const;

export type JobEmploymentTypeValue = (typeof JOB_EMPLOYMENT_TYPES)[number]["value"];

export function formatEmploymentType(value: string | null | undefined): string | null {
  if (!value) return null;
  return JOB_EMPLOYMENT_TYPES.find((t) => t.value === value)?.label ?? value;
}

export function formatWorkMode(value: string | null | undefined): string | null {
  if (!value) return null;
  return JOB_WORK_MODES.find((t) => t.value === value)?.label ?? value;
}

function formatLakh(n: number): string {
  const lakhs = n / 100_000;
  if (Number.isInteger(lakhs)) return `₹${lakhs}L`;
  return `₹${lakhs.toFixed(1).replace(/\.0$/, "")}L`;
}

/** Pretty salary for feed/detail. Large annual-style amounts use Lakh notation. */
export function formatJobSalary(
  min: number | null | undefined,
  max: number | null | undefined
): string | null {
  if (min == null && max == null) return "Not disclosed";
  const fmtMonthly = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  const useLakh = (min != null && min >= 100_000) || (max != null && max >= 100_000);

  if (min != null && max != null) {
    if (min === max) {
      return useLakh ? formatLakh(min) : `${fmtMonthly(min)} / month`;
    }
    if (useLakh) return `${formatLakh(min)} – ${formatLakh(max)}`;
    return `${fmtMonthly(min)} – ${fmtMonthly(max)} / month`;
  }
  if (min != null) {
    return useLakh ? `From ${formatLakh(min)}` : `From ${fmtMonthly(min)} / month`;
  }
  return useLakh ? `Up to ${formatLakh(max!)}` : `Up to ${fmtMonthly(max!)} / month`;
}

export function formatJobExperience(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const v = value.trim();
  if (/^fresher$/i.test(v) || v === "0") return "Fresher";
  return v;
}

/** Indian mobile: 10 digits starting 6–9. */
export function isValidIndianMobile(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  const normalized = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(normalized);
}

export function normalizeIndianMobile(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return digits;
}
