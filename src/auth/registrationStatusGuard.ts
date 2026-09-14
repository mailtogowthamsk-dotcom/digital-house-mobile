/**
 * Central registration-status → navigation guard.
 * Authentication verifies identity; this decides where the user may go.
 */

export type RegistrationRootRoute =
  | "Landing"
  | "Home"
  | "PendingApproval"
  | "RegistrationCorrection"
  | "Rejected"
  | "GoogleCompleteProfile"
  | "SetUsername";

export type RegistrationAuthStatus =
  | "signedOut"
  | "home"
  | "pending"
  | "changes_requested"
  | "rejected";

export type RegistrationUserLike = {
  status: string;
  profileComplete?: boolean | null;
  needsUsernameSetup?: boolean | null;
  username?: string | null;
};

function isWaiting(status: string): boolean {
  return status === "PENDING" || status === "PENDING_REVIEW";
}

export function isWaitingAuthStatus(status: string): boolean {
  return status === "pending" || status === "changes_requested";
}

/**
 * Force re-login only when an existing waiting *registration* session discovers
 * APPROVED (old JWT was revoked on approve).
 *
 * Do NOT key off authStatus alone — "pending" also means username-setup for
 * already-APPROVED users, and OTP/Google sign-in must be allowed to reach Home.
 */
export function shouldReauthAfterApproval(
  previous: RegistrationUserLike | null,
  _previousAuthStatus: string,
  next: RegistrationUserLike | null,
  signedOut: boolean
): boolean {
  if (signedOut || !next || next.status !== "APPROVED") return false;
  if (!previous) return false;
  return isWaiting(previous.status) || previous.status === "CHANGES_REQUESTED";
}

/** Single post-auth router used by AuthContext for OTP + Google. */
export function routeForRegistrationUser(
  user: RegistrationUserLike | null,
  signedOut: boolean
): RegistrationRootRoute {
  if (signedOut || !user) return "Landing";
  if (user.status === "REJECTED") return "Rejected";
  if (user.status === "SUSPENDED") return "Landing";
  if (user.profileComplete === false) return "GoogleCompleteProfile";
  if (!String(user.username ?? "").trim() || user.needsUsernameSetup) {
    // APPROVED or otherwise session-capable without @username → force setup.
    if (user.status === "APPROVED" || user.profileComplete === true) {
      return "SetUsername";
    }
  }
  if (user.status === "APPROVED") return "Home";
  if (user.status === "CHANGES_REQUESTED") return "RegistrationCorrection";
  if (isWaiting(user.status)) return "PendingApproval";
  return "Landing";
}

export function authStatusForRegistrationUser(
  user: RegistrationUserLike | null,
  signedOut: boolean
): RegistrationAuthStatus {
  if (signedOut || !user) return "signedOut";
  if (user.status === "REJECTED") return "rejected";
  if (user.status === "SUSPENDED") return "signedOut";
  if (user.profileComplete === false) return "pending";
  // Must not treat username-less accounts as fully home (search/connect require @username).
  if (user.status === "APPROVED" && (user.needsUsernameSetup || !String(user.username ?? "").trim())) {
    return "pending";
  }
  if (user.status === "APPROVED") return "home";
  if (user.status === "CHANGES_REQUESTED") return "changes_requested";
  if (isWaiting(user.status)) return "pending";
  return "signedOut";
}
