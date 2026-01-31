import { api } from "./client";

export type RegisterPayload = {
  fullName: string;
  gender?: string | null;
  dob?: string | null;
  email: string;
  mobile?: string | null;
  occupation?: string | null;
  location?: string | null;
  community?: string | null;
  kulam?: string | null;
  profilePhoto?: string | null;
  govtIdType?: string | null;
  govtIdFile?: string | null;
};

export async function register(payload: RegisterPayload) {
  const { data } = await api.post("/auth/register", payload);
  return data as { ok: boolean; message: string; user: { id: number; email: string; status: string } };
}

/** Returns { ok, message }. On 403: account pending or rejected (check response message). */
export async function loginRequest(email: string) {
  const { data } = await api.post("/auth/login-request", { email: email.trim().toLowerCase() });
  return data as { ok: boolean; message: string };
}

export async function verifyOtp(email: string, otp: string) {
  const { data } = await api.post("/auth/verify-otp", {
    email: email.trim().toLowerCase(),
    otp: otp.trim()
  });
  return data as {
    ok: boolean;
    accessToken: string;
    user: { id: number; fullName: string; email: string; status: string };
  };
}

export type MeUser = { id: number; fullName: string; email: string; status: string; createdAt: string };

export async function getMe(): Promise<MeUser> {
  const { data } = await api.get<{ ok: boolean; user: MeUser }>("/auth/me");
  if (!data.ok || !data.user) throw new Error("Failed to load profile");
  return data.user;
}
