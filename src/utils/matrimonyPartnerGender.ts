/** Normalize account/profile gender to MALE | FEMALE only. */
export function normalizeBinaryGender(gender: string | null | undefined): "MALE" | "FEMALE" | null {
  const s = String(gender ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  if (s === "MALE" || s === "M" || s === "MAN" || s === "BOY") return "MALE";
  if (s === "FEMALE" || s === "F" || s === "WOMAN" || s === "GIRL") return "FEMALE";
  return null;
}

/**
 * Candidate (bride/groom) gender from "Who is this profile for?".
 * SON/BROTHER → male, DAUGHTER/SISTER → female, SELF → account gender.
 */
export function candidateGenderFromLookingFor(
  lookingFor: string | null | undefined,
  accountGender: string | null | undefined
): "MALE" | "FEMALE" | null {
  const lf = String(lookingFor ?? "").toUpperCase();
  if (lf === "SON" || lf === "BROTHER") return "MALE";
  if (lf === "DAUGHTER" || lf === "SISTER") return "FEMALE";
  if (lf === "SELF") return normalizeBinaryGender(accountGender);
  return null;
}

/** Preferred partner is always the opposite binary gender. */
export function oppositePartnerGender(
  candidateGender: "MALE" | "FEMALE" | null | undefined
): "MALE" | "FEMALE" | null {
  if (candidateGender === "MALE") return "FEMALE";
  if (candidateGender === "FEMALE") return "MALE";
  return null;
}

export function autoPartnerFieldsFromLookingFor(
  lookingFor: string | null | undefined,
  accountGender: string | null | undefined
): {
  candidateGender: "MALE" | "FEMALE" | null;
  partnerGenderPreference: "MALE" | "FEMALE" | null;
} {
  const candidateGender = candidateGenderFromLookingFor(lookingFor, accountGender);
  return {
    candidateGender,
    partnerGenderPreference: oppositePartnerGender(candidateGender)
  };
}
