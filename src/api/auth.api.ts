import { api } from "./client";

export type RegisterPayload = {
  fullName: string;
  username: string;
  gender?: string | null;
  dob?: string | null;
  email: string;
  mobile?: string | null;
  occupation?: string | null;
  location: string;
  community?: string | null;
  kulam: string;
  profilePhoto?: string | null;
  govtIdType?: string | null;
  govtIdFile?: string | null;
};

export async function register(payload: RegisterPayload) {
  const { data } = await api.post("/auth/register", payload);
  return data as { ok: boolean; message: string; user: { id: number; email: string; status: string } };
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
};

export type GoogleAuthResponse = {
  accessToken: string;
  user: MeUser;
  isNewUser: boolean;
  linkedExistingAccount: boolean;
  needsProfileCompletion: boolean;
};

export async function googleAuth(idToken: string): Promise<GoogleAuthResponse> {
  const { data } = await api.post("/auth/google", { idToken });
  if (!data?.accessToken || !data?.user) {
    throw new Error((data as any)?.message ?? "Google sign-in failed");
  }
  return data as GoogleAuthResponse;
}

export type CompleteGoogleProfilePayload = {
  username: string;
  gender: string;
  dob: string;
  district: string;
  kulam: string;
  community?: string | null;
  location?: string | null;
  mobile?: string | null;
  profilePhoto?: string | null;
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
  const { data } = await api.get<{ ok: boolean; user: MeUser }>("/auth/me");
  if (!data.ok || !data.user) throw new Error("Failed to load profile");
  return data.user;
}
