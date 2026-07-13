export const JOB_EMPLOYMENT_TYPES = [
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "INTERNSHIP", label: "Internship" },
  { value: "TEMPORARY", label: "Temporary" }
] as const;

export type JobEmploymentTypeValue = (typeof JOB_EMPLOYMENT_TYPES)[number]["value"];

export function formatEmploymentType(value: string | null | undefined): string | null {
  if (!value) return null;
  return JOB_EMPLOYMENT_TYPES.find((t) => t.value === value)?.label ?? value;
}

export function formatJobSalary(
  min: number | null | undefined,
  max: number | null | undefined
): string | null {
  if (min == null && max == null) return null;
  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  if (min != null && max != null) {
    if (min === max) return `${fmt(min)} / mo`;
    return `${fmt(min)} – ${fmt(max)} / mo`;
  }
  if (min != null) return `From ${fmt(min)} / mo`;
  return `Up to ${fmt(max!)} / mo`;
}
