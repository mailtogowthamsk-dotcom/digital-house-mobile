/**
 * Session memory of videos already buffered / played.
 * Keys are stable media paths (no signed query) so feed URL refresh
 * does not look like a cache miss.
 */

import { videoCacheIdentity } from "./videoSource";

const warmed = new Map<string, number>(); // key -> lastAccessMs
const MAX = 48;

function touch(key: string): void {
  warmed.set(key, Date.now());
  if (warmed.size <= MAX) return;
  // Evict least-recently used
  let oldestKey: string | null = null;
  let oldestAt = Infinity;
  for (const [k, at] of warmed) {
    if (at < oldestAt) {
      oldestAt = at;
      oldestKey = k;
    }
  }
  if (oldestKey) warmed.delete(oldestKey);
}

export function markVideoUriWarmed(uri: string | null | undefined): void {
  const key = videoCacheIdentity(uri);
  if (!key) return;
  touch(key);
}

export function isVideoUriWarmed(uri: string | null | undefined): boolean {
  const key = videoCacheIdentity(uri);
  if (!key) return false;
  if (!warmed.has(key)) return false;
  touch(key);
  return true;
}

export function clearVideoUriWarmCache(): void {
  warmed.clear();
}
