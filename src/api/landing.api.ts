import { api } from "./client";

export type LandingContact = {
  email: string;
  mobile: string;
};

export async function getLandingContent() {
  const { data } = await api.get("/landing");
  return data as { headline: string };
}

/** In-memory cache — landing contact is static config; fetch once per session. */
let contactCache: LandingContact | null = null;
let contactPromise: Promise<LandingContact | null> | null = null;

export async function getLandingContact(): Promise<LandingContact | null> {
  if (contactCache) return contactCache;
  if (contactPromise) return contactPromise;

  contactPromise = api
    .get<LandingContact>("/landing/contact")
    .then(({ data }) => {
      const email = data?.email?.trim() ?? "";
      const mobile = data?.mobile?.trim() ?? "";
      if (!email || !mobile) {
        contactCache = null;
        return null;
      }
      contactCache = { email, mobile };
      return contactCache;
    })
    .catch(() => {
      contactCache = null;
      return null;
    })
    .finally(() => {
      contactPromise = null;
    });

  return contactPromise;
}
