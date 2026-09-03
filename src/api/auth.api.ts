import { api } from "./client";
import type { LegalAcceptance, LegalAcceptanceStatus } from "./legal.api";

export type RegisterPayload = {
  fullName: string;
  username: string;
  gender?: string | null;
  dob?: string | null;
  email: string;
  mobile?: string | null;
  occupation?: string | null;
  location: string;
  kulam: string;
  profilePhoto?: string | null;
  govtIdType?: string | null;
  govtIdFile?: string | null;
  legalAcceptances?: LegalAcceptance[];
  referralCode?: string | null;
};

export async function register(payload: RegisterPayload) {
  const { data } = await api.post("/auth/register", payload);
  const payloadOut = data as {
    ok: boolean;
    message: string;
    accessToken?: string;
    user?: MeUser;
  };
  if (!payloadOut?.ok || !payloadOut.accessToken || !payloadOut.user) {
    throw new Error(payloadOut?.message || "Registration failed. Please try again.");
  }
  return {
    ok: true as const,
    message: payloadOut.message,
    accessToken: payloadOut.accessToken,
    user: payloadOut.user
  };
}

/** Attach optional profile photo after register (PENDING session). */
export async function setRegistrationPhoto(profilePhoto: string): Promise<MeUser> {
  const { data } = await api.post<{ ok: boolean; user: MeUser; message?: string }>(
    "/auth/registration-photo",
    { profilePhoto }
  );
  if (!data?.ok || !data.user) throw new Error(data?.message || "Failed to save profile photo");
  return data.user;
}

/** Returns { ok, message, sent?, retryAfterSec? }. On 403: account pending or rejected. */
export async function loginRequest(email: string) {
  const { data } = await api.post("/auth/login-request", { email: email.trim().toLowerCase() });
  return data as {
    ok: boolean;
    message: string;
    sent?: boolean;
    retryAfterSec?: number;
  };
}

export async function verifyOtp(email: string, otp: string) {
  const { data } = await api.post("/auth/verify-otp", {
    email: email.trim().toLowerCase(),
    otp: otp.trim()
  });
  const payload = data as {
    ok?: boolean;
    accessToken?: string;
    user?: MeUser;
    message?: string;
  };
  if (!payload?.accessToken || !payload?.user) {
    throw new Error(payload?.message || "OTP verification failed. Please try again.");
  }
  return {
    ok: true as const,
    accessToken: payload.accessToken,
    user: payload.user
  };
}

export type AuthProviderCode = "EXISTING_LOGIN" | "GOOGLE";

export type MeUser = {
  id: number;
  fullName: string;
  username?: string | null;
  email: string;
  mobile?: string | null;
  status: string;
  createdAt: string;
  profileComplete?: boolean;
  needsUsernameSetup?: boolean;
  profileVisibility?: "PUBLIC" | "PRIVATE";
  allowConnectionRequests?: boolean;
  signupProvider?: AuthProviderCode;
  linkedProviders?: AuthProviderCode[];
  emailVerified?: boolean;
  profilePhoto?: string | null;
  registrationAdminRemarks?: string | null;
  registrationRequestedFields?: string[];
  pendingMobile?: string | null;
  pendingProfilePhoto?: string | null;
  community?: string | null;
  kulam?: string | null;
  /** Present when GET /auth/me includes legal acceptance status. */
  legal?: LegalAcceptanceStatus | null;
};

export type GoogleAuthResponse = {
  accessToken: string;
  user: MeUser;
  isNewUser: boolean;
  linkedExistingAccount: boolean;
  needsProfileCompletion: boolean;
};

export async function googleAuth(idToken: string): Promise<GoogleAuthResponse> {
  const { data } = await api.post<{
    ok?: boolean;
    message?: string;
    accessToken?: string;
    user?: MeUser;
    isNewUser?: boolean;
    linkedExistingAccount?: boolean;
    needsProfileCompletion?: boolean;
  }>("/auth/google", { idToken });
  if (data?.ok === false) {
    throw new Error(data.message || "Google sign-in failed");
  }
  if (!data?.accessToken || !data?.user) {
    throw new Error(
      "Google sign-in got an incomplete server response. Confirm the preview API URL points to /digitalhouse/backend/api and Google client IDs match the server."
    );
  }
  return {
    accessToken: data.accessToken,
    user: data.user,
    isNewUser: Boolean(data.isNewUser),
    linkedExistingAccount: Boolean(data.linkedExistingAccount),
    needsProfileCompletion: Boolean(data.needsProfileCompletion)
  };
}

export type CompleteGoogleProfilePayload = {
  username: string;
  gender: string;
  dob: string;
  district: string;
  kulam: string;
  location?: string | null;
  mobile?: string | null;
  profilePhoto?: string | null;
  legalAcceptances?: LegalAcceptance[];
  referralCode?: string | null;
};

export async function completeGoogleProfile(payload: CompleteGoogleProfilePayload) {
  const { data } = await api.post<{ ok: boolean; user: MeUser }>(
    "/auth/complete-google-profile",
    payload
  );
  if (!data?.ok || !data.user) throw new Error("Failed to complete profile");
  return data;
}

export type LinkedAccountsResponse = {
  providers: AuthProviderCode[];
  googleConnected: boolean;
  existingLoginConnected: boolean;
  loginSource: string;
};

export async function getLinkedAccounts(): Promise<LinkedAccountsResponse> {
  const { data } = await api.get<{ ok: boolean } & LinkedAccountsResponse>("/auth/linked-accounts");
  if (!data?.ok) throw new Error("Failed to load linked accounts");
  return data;
}

export async function getMe(): Promise<MeUser> {
  const { data } = await api.get<{
    ok: boolean;
    user: MeUser;
    legal?: LegalAcceptanceStatus;
  }>("/auth/me");
  if (!data.ok || !data.user) throw new Error("Failed to load profile");
  return {
    ...data.user,
    legal: data.legal ?? data.user.legal ?? null
  };
}

export type SubmitRegistrationCorrectionPayload = {
  mobile?: string | null;
  profilePhoto?: string | null;
  referralCode?: string | null;
};

export async function submitRegistrationCorrection(
  payload: SubmitRegistrationCorrectionPayload
): Promise<MeUser> {
  const { data } = await api.post<{ ok: boolean; user: MeUser; message?: string }>(
    "/auth/registration-correction",
    payload
  );
  if (!data?.ok || !data.user) throw new Error(data?.message || "Failed to submit corrections");
  return data.user;
}

export type OwnReferralStatus = {
  status: string;
  canSubmit: boolean;
  adminNote: string | null;
};

export async function getOwnReferralStatus(): Promise<OwnReferralStatus> {
  const { data } = await api.get<{ ok: boolean } & OwnReferralStatus>("/auth/referral-status");
  if (!data?.ok) throw new Error("Failed to load referral status");
  return { status: data.status, canSubmit: data.canSubmit, adminNote: data.adminNote ?? null };
}

export async function submitReferralCode(referralCode: string): Promise<{ status: string; message: string }> {
  const { data } = await api.post<{ ok: boolean; status?: string; message?: string }>(
    "/auth/referral-submit",
    { referralCode }
  );
  if (!data?.ok) throw new Error(data?.message || "Invalid referral code. Please check the code and try again.");
  return {
    status: data.status || "PENDING_ADMIN_VERIFICATION",
    message: data.message || "Referral submitted successfully. Your registration is pending admin verification."
  };
}

export type OwnReferralCode = { code: string; memberDisplayId: string };

export async function getOwnReferralCode(): Promise<OwnReferralCode> {
  const { data } = await api.get<{ ok: boolean } & OwnReferralCode>("/auth/referral-code");
  if (!data?.ok || !data.code) throw new Error("Referral code unavailable");
  return { code: data.code, memberDisplayId: data.memberDisplayId };
}

export async function regenerateOwnReferralCode(): Promise<OwnReferralCode> {
  const { data } = await api.post<{ ok: boolean } & OwnReferralCode>("/auth/referral-code/regenerate", {});
  if (!data?.ok || !data.code) throw new Error("Could not regenerate referral code");
  return { code: data.code, memberDisplayId: data.memberDisplayId };
}
