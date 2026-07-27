/**
 * Sticky signed-URL cache keyed by object path (no query).
 * Prevents feed refreshes from minting a new signature every time, which
 * defeats expo-image / expo-video / HTTP caches (session: 85% miss).
 */

import { stableMediaCacheKey } from "./imageDimensions";

type Entry = { url: string; expiresAt: number };

const cache = new Map<string, Entry>();
const MAX = 300;

/** Prefer keeping a URL for most of a typical 1h signature. */
const DEFAULT_TTL_MS = 50 * 60 * 1000;
/** Refresh when under this much life remains. */
const REFRESH_SKEW_MS = 2 * 60 * 1000;

function prune(): void {
  if (cache.size <= MAX) return;
  const now = Date.now();
  for (const [k, v] of cache) {
    if (v.expiresAt <= now) cache.delete(k);
  }
  while (cache.size > MAX) {
    const first = cache.keys().next().value;
    if (!first) break;
    cache.delete(first);
  }
}

/** Best-effort parse Amz expiry; falls back to DEFAULT_TTL_MS. */
function estimateExpiryMs(url: string): number {
  try {
    const u = new URL(url);
    const expires = u.searchParams.get("X-Amz-Expires");
    const date = u.searchParams.get("X-Amz-Date");
    if (expires && date) {
      // date: 20260727T180000Z
      const y = Number(date.slice(0, 4));
      const mo = Number(date.slice(4, 6)) - 1;
      const d = Number(date.slice(6, 8));
      const h = Number(date.slice(9, 11));
      const mi = Number(date.slice(11, 13));
      const s = Number(date.slice(13, 15));
      const start = Date.UTC(y, mo, d, h, mi, s);
      const ttlSec = Number(expires);
      if (Number.isFinite(start) && Number.isFinite(ttlSec) && ttlSec > 0) {
        return start + ttlSec * 1000 - REFRESH_SKEW_MS;
      }
    }
  } catch {
    /* ignore */
  }
  return Date.now() + DEFAULT_TTL_MS;
}

/**
 * Return a stable signed URL for this media path.
 * If we already hold a non-expired signature for the same object, keep it.
 */
export function stickySignedMediaUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  const key = stableMediaCacheKey(trimmed);
  if (!key) return trimmed;

  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.url;
  }

  prune();
  cache.set(key, { url: trimmed, expiresAt: estimateExpiryMs(trimmed) });
  return trimmed;
}

export function clearStickySignedMediaUrls(): void {
  cache.clear();
}
