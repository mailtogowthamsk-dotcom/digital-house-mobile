/**
 * Configure expo-video on-device LRU disk cache once at startup.
 * Must run before any VideoPlayer is created (module load / early App boot).
 *
 * Feed playback defaults to useCaching:false (see videoSource.ts) and relies on
 * feedVideoFileCache. Keep a modest native cache size for any opt-in callers.
 */

import { Platform } from "react-native";
import { setVideoCacheSizeAsync } from "expo-video";

/** ~256MB — reserved for rare opt-in useCaching paths; OS LRU evicts older entries. */
const FEED_VIDEO_CACHE_BYTES = 256 * 1024 * 1024;

let started = false;

export function initFeedVideoDiskCache(): void {
  if (started) return;
  started = true;
  if (Platform.OS === "web") return;
  void setVideoCacheSizeAsync(FEED_VIDEO_CACHE_BYTES).catch(() => {
    /* Expo Go / unsupported native — progressive download still works */
  });
}
