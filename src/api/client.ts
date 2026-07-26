import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { getTokenReliable } from "../storage/token.storage";
import { shouldAutoClearOn401, invokeAuthSignOut } from "../auth/authSession";

type RetryableConfig = InternalAxiosRequestConfig & {
  __retryCount?: number;
  __authRetry?: boolean;
};

function isLocalLanApiUrl(url: string): boolean {
  return /\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.|localhost|127\.0\.0\.1)/i.test(url);
}

function isTransientNetworkError(err: AxiosError): boolean {
  if (err.response) return false;
  const code = err.code ?? "";
  const msg = (err.message ?? "").toLowerCase();
  return (
    code === "ERR_NETWORK" ||
    code === "ECONNABORTED" ||
    code === "ETIMEDOUT" ||
    msg.includes("network") ||
    msg.includes("timeout")
  );
}

const PRODUCTION_API = "https://www.infosensetechnologies.com/digitalhouse/backend/api";

/**
 * Production API must use www (Apache 301 on bare domain breaks some clients).
 * Normalize env / extra / fallback to a single canonical URL.
 */
export function normalizeApiBaseUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (!trimmed) return PRODUCTION_API;
  try {
    const u = new URL(trimmed);
    if (u.hostname === "infosensetechnologies.com") {
      u.hostname = "www.infosensetechnologies.com";
    }
    let out = u.toString().replace(/\/+$/, "");
    if (!out.endsWith("/api")) out = `${out}/api`;
    return out;
  } catch {
    return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
  }
}

function readEnvApiUrl(): string | undefined {
  try {
    const fromExtra = Constants.expoConfig?.extra?.apiUrl as string | undefined;
    if (fromExtra?.trim()) return fromExtra.trim();
    return process.env.EXPO_PUBLIC_API_URL?.trim();
  } catch {
    return undefined;
  }
}

/**
 * API base URL (must end with /api). Re-read env each call so `expo start` picks up .env changes.
 */
export function getApiBaseUrl(): string {
  const isWeb =
    typeof window !== "undefined" && typeof window.location !== "undefined";
  const raw = readEnvApiUrl();
  const trimmed = String(raw ?? "").trim();
  let base = trimmed ? normalizeApiBaseUrl(trimmed) : PRODUCTION_API;

  if (
    isWeb &&
    (!trimmed || !trimmed.startsWith("http") || trimmed.startsWith(window.location.origin))
  ) {
    base = PRODUCTION_API;
  }

  return normalizeApiBaseUrl(base);
}

/** Server base URL (no /api) – for building absolute image URLs */
export function getServerBaseUrl(): string {
  return getApiBaseUrl().replace(/\/api\/?$/, "");
}

export const api = axios.create({
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json"
  }
});

api.interceptors.request.use(async (config) => {
  config.baseURL = getApiBaseUrl();
  try {
    const token = await getTokenReliable();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {
    /* SecureStore */
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const config = err.config as RetryableConfig | undefined;

    if (
      Platform.OS === "android" &&
      config &&
      !config.__retryCount &&
      isTransientNetworkError(err) &&
      (config.method ?? "get").toLowerCase() === "get"
    ) {
      config.__retryCount = 1;
      await new Promise((r) => setTimeout(r, 900));
      config.baseURL = getApiBaseUrl();
      try {
        return await api.request(config);
      } catch (retryErr) {
        err = retryErr as AxiosError;
      }
    }

    const retryStatus = err.response?.status;
    if (retryStatus === 401 && config && !config.__authRetry) {
      config.__authRetry = true;
      try {
        const token = await getTokenReliable();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          await new Promise((r) => setTimeout(r, 250));
          config.baseURL = getApiBaseUrl();
          return await api.request(config);
        }
      } catch {
        /* fall through */
      }
    }

    if (retryStatus === 401 && shouldAutoClearOn401() && shouldSignOutOn401(err, config)) {
      try {
        await invokeAuthSignOut();
      } catch {
        /* ignore */
      }
    }
    return Promise.reject(err);
  }
);

function get401Message(err: AxiosError): string {
  const msg = (err.response?.data as { message?: string } | undefined)?.message;
  return typeof msg === "string" ? msg : "";
}

/** Only sign out on confirmed session invalidation — not transient missing-token races. */
export function isSessionInvalid401(err: unknown): boolean {
  if (!err || typeof err !== "object" || !("response" in err)) return false;
  const ax = err as AxiosError;
  if (ax.response?.status !== 401) return false;
  const msg = get401Message(ax);
  if (msg === "Unauthorized") return false;
  const url = String((ax.config as RetryableConfig | undefined)?.url ?? "");
  return msg === "Invalid or expired token" || url.includes("/auth/me");
}

function shouldSignOutOn401(err: AxiosError, config?: RetryableConfig): boolean {
  const msg = get401Message(err);
  if (msg === "Unauthorized") return false;
  const url = String(config?.url ?? "");
  return msg === "Invalid or expired token" || url.includes("/auth/me");
}

export function getErrorStatus(err: unknown): number | undefined {
  return err && typeof err === "object" && "response" in err
    ? (err as AxiosError).response?.status
    : undefined;
}

export function getAuthErrorMessage(err: unknown): string {
  if (!err || typeof err !== "object") return "Something went wrong. Please try again.";
  const ax = err as AxiosError;
  const msg = (ax.response?.data as { message?: string })?.message;
  if (msg && typeof msg === "string") return msg;
  const status = ax.response?.status;
  if (status === 401) {
    return "Session expired or not signed in. Please log in again and retry.";
  }
  if (status === 403) {
    return msg || "Your account cannot access this feature yet.";
  }
  if (status === 400) return "Invalid request. Please check your details.";
  if (status === 409) {
    return msg || "This mobile number/email is already registered.";
  }
  if (status === 500) return "Server error. Please try again in a moment.";
  if (status === 503) return "Server is starting up. Please try again in a few seconds.";
  if (status === 404) {
    return `API not found (404). Check server proxy and URL: ${getApiBaseUrl()}`;
  }
  if (ax.code === "ECONNABORTED" || ax.message?.toLowerCase().includes("timeout")) {
    return "Request timed out. Please check your connection and try again.";
  }
  if (
    !ax.response &&
    (ax.code === "ECONNREFUSED" ||
      ax.code === "ERR_NETWORK" ||
      ax.message?.toLowerCase().includes("network"))
  ) {
    const base = getApiBaseUrl();
    const hint = __DEV__ ? ` (${base})` : "";
    if (Platform.OS === "android" && isLocalLanApiUrl(base)) {
      return `Cannot reach your dev server${hint}. On Realme/Oppo: turn off "Wi‑Fi assistant" / "Smart network switch", keep phone on the same Wi‑Fi as your computer, and disable battery restrictions for this app. Or use the production HTTPS API URL in mobile/.env.`;
    }
    return `Cannot reach server. Check internet and API URL${hint}.`;
  }
  return "Request failed. Please try again.";
}

function toGoogleDriveDirectUrl(url: string): string | null {
  const match = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  return `https://drive.google.com/uc?export=view&id=${match[1]}`;
}

export function getImageUrl(uri: string | null | undefined): string | null {
  if (!uri || typeof uri !== "string" || !uri.trim()) return null;
  const trimmed = uri.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const driveDirect = toGoogleDriveDirectUrl(trimmed);
    if (driveDirect) return driveDirect;
    return trimmed;
  }
  const base = getServerBaseUrl().replace(/\/$/, "");
  return trimmed.startsWith("/") ? `${base}${trimmed}` : `${base}/${trimmed}`;
}
