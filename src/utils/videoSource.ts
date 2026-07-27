/**
 * Build expo-video sources with on-device LRU disk cache enabled.
 * Prefer playing from path-keyed file:// cache (feedVideoFileCache) so new
 * signed query strings cannot defeat the cache.
 */

import type { VideoSource } from "expo-video";
import { stableMediaCacheKey } from "./imageDimensions";

export function buildFeedVideoSource(uri: string): VideoSource {
  const trimmed = uri.trim();
  const isLocal = trimmed.startsWith("file://") || trimmed.startsWith("/");
  const isMp4 = /\.(mp4|m4v)(\?|$)/i.test(trimmed);
  if (isLocal) {
    return {
      uri: trimmed,
      ...(isMp4 ? { contentType: "progressive" as const } : {})
    };
  }
  return {
    uri: trimmed,
    useCaching: true,
    ...(isMp4 ? { contentType: "progressive" as const } : {})
  };
}

/** Stable identity for warm/cache bookkeeping (strips signed query). */
export function videoCacheIdentity(uri: string | null | undefined): string {
  return stableMediaCacheKey(uri);
}
