import axios, { AxiosError } from "axios";
import { getToken } from "../storage/token.storage";
import { clearToken } from "../storage/token.storage";

// Use your Mac's LAN IP so the phone/simulator can reach the backend.
// Find it on Mac: Terminal → ifconfig | grep "inet " (use the 192.168.x.x or 10.0.x.x address).
// iOS Simulator can use localhost; physical device must use Mac's IP.
const API_BASE =
  "http://192.168.0.2:4000/api"; /* change to your Mac IP if different, e.g. 192.168.1.5 */

/** Server base URL (no /api) – for building absolute image URLs from relative paths */
export const SERVER_BASE = API_BASE.replace(/\/api\/?$/, "") || "http://192.168.0.2:4000";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000
});

/** Attach JWT from secure storage to every request */
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
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
      await clearToken();
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

