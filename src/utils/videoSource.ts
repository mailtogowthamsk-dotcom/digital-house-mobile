/**
 * Build expo-video sources for feed playback.
 * Prefer path-keyed file:// cache (feedVideoFileCache) so new signed query
 * strings cannot defeat the cache. Native expo-video `useCaching` stays off by
 * default — it stalls HEVC/MOV on iOS and hangs progressive sources on Android
 * Expo Go / SDK 57+.
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
  const useCaching = opts?.useCaching ?? false;
  return {
    uri: trimmed,
    useCaching
  };
}

/** Stable identity for warm/cache bookkeeping (strips signed query). */
export function videoCacheIdentity(uri: string | null | undefined): string {
  return stableMediaCacheKey(uri);
}
