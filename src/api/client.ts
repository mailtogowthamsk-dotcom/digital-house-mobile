import axios, { AxiosError } from "axios";
import { getToken } from "../storage/token.storage";
import { clearToken } from "../storage/token.storage";

const PRODUCTION_API = "https://digitalhouse-backend-production.up.railway.app/api";

/**
 * API base URL (must end with /api). Set EXPO_PUBLIC_API_URL in .env or app config.
 * On web, env may be missing or point at the app origin — we force production URL so login works.
 */
function getApiBase(): string {
  const isWeb = typeof window !== "undefined" && typeof window.location !== "undefined";
  let raw: string | undefined;
  try {
    raw =
      (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_URL) ||
      undefined;
  } catch {
    raw = undefined;
  }
  const trimmed = String(raw ?? "").trim().replace(/\/+$/, "");
  let base = trimmed || PRODUCTION_API;
  // On web: never use same origin or relative URL (avoids 404 on login-request)
  if (isWeb && (!trimmed || !trimmed.startsWith("http") || trimmed.startsWith(window.location.origin))) {
    base = PRODUCTION_API;
  }
  return base.endsWith("/api") ? base : `${base}/api`;
}

const API_BASE = getApiBase();

/** Server base URL (no /api) – for building absolute image URLs from relative paths */
export const SERVER_BASE = API_BASE.replace(/\/api\/?$/, "") || API_BASE;

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json"
  }
});

/** Attach JWT from secure storage to every request */
api.interceptors.request.use(async (config) => {
  try {
    const token = await getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {
    // Avoid crash if SecureStore fails on some Android devices
  }
  return config;
});

/**
 * Response interceptor: handle auth errors.
 * 401 → clear token so caller can redirect to Login.
 * 403 → leave token; caller can show "Approval Pending" and redirect to PendingApproval.
 */
api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const status = err.response?.status;
    if (status === 401) {
      try {
        await clearToken();
      } catch {
        // Avoid crash on Android
      }
    }
    return Promise.reject(err);
  }
);

/** Helper: get HTTP status from an axios error (for 401/403 handling in screens) */
export function getErrorStatus(err: unknown): number | undefined {
  return err && typeof err === "object" && "response" in err
    ? (err as AxiosError).response?.status
    : undefined;
}

/** User-friendly message for registration/login failures (network, timeout, 4xx/5xx) */
export function getAuthErrorMessage(err: unknown): string {
  if (!err || typeof err !== "object") return "Something went wrong. Please try again.";
  const ax = err as AxiosError;
  const msg = (ax.response?.data as { message?: string })?.message;
  if (msg && typeof msg === "string") return msg;
  const status = ax.response?.status;
  if (status === 400) return "Invalid request. Please check your details.";
  if (status === 409) return "An account with this email or mobile already exists.";
  if (status === 500) return "Server error. Please try again in a moment.";
  if (status === 503) return "Server is starting up. Please try again in a few seconds.";
  if (ax.code === "ECONNABORTED" || ax.message?.toLowerCase().includes("timeout")) return "Request timed out. Please check your connection and try again.";
  if (!ax.response && (ax.code === "ECONNREFUSED" || ax.code === "ERR_NETWORK" || ax.message?.toLowerCase().includes("network"))) return "Cannot reach server. Check your internet connection and try again.";
  return "Registration failed. Please try again.";
}

/**
 * Convert Google Drive sharing URL to direct image URL so it loads in Image component.
 * Sharing: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * Direct:  https://drive.google.com/uc?export=view&id=FILE_ID
 */
function toGoogleDriveDirectUrl(url: string): string | null {
  const match = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  return `https://drive.google.com/uc?export=view&id=${match[1]}`;
}

/**
 * Convert profile/post image URL to absolute and usable in Image.
 * - Relative paths → prepend SERVER_BASE (e.g. /uploads/photo.jpg).
 * - Google Drive sharing URLs → convert to direct view URL so image loads.
 */
export function getImageUrl(uri: string | null | undefined): string | null {
  if (!uri || typeof uri !== "string" || !uri.trim()) return null;
  const trimmed = uri.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const driveDirect = toGoogleDriveDirectUrl(trimmed);
    if (driveDirect) return driveDirect;
    return trimmed;
  }
  const base = SERVER_BASE.endsWith("/") ? SERVER_BASE.slice(0, -1) : SERVER_BASE;
  return trimmed.startsWith("/") ? `${base}${trimmed}` : `${base}/${trimmed}`;
}

