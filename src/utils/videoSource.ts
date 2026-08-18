/**
 * Build expo-video sources with on-device LRU disk cache enabled.
 * Prefer playing from path-keyed file:// cache (feedVideoFileCache) so new
 * signed query strings cannot defeat the cache.
 */

import type { VideoSource } from "expo-video";
import { stableMediaCacheKey } from "./imageDimensions";

export function buildFeedVideoSource(
  uri: string,
  opts?: { useCaching?: boolean }
): VideoSource {
  const trimmed = uri.trim();
  const isLocal = trimmed.startsWith("file://") || trimmed.startsWith("/");
  if (isLocal) {
    return { uri: trimmed };
  }
  // Do not force contentType "progressive" — HEVC/fMP4/MOV then stall in "loading"
  // forever on some devices. Let expo-video auto-detect.
  return {
    uri: trimmed,
    useCaching: opts?.useCaching !== false
  };
}

/** Stable identity for warm/cache bookkeeping (strips signed query). */
export function videoCacheIdentity(uri: string | null | undefined): string {
  return stableMediaCacheKey(uri);
}
