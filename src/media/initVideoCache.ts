/**
 * Configure expo-video on-device LRU disk cache once at startup.
 * Must run before any VideoPlayer is created (module load / early App boot).
 */

import { Platform } from "react-native";
import { setVideoCacheSizeAsync } from "expo-video";

/** ~512MB — enough for dozens of short feed clips; OS LRU evicts older entries. */
const FEED_VIDEO_CACHE_BYTES = 512 * 1024 * 1024;

let started = false;

export function initFeedVideoDiskCache(): void {
  if (started) return;
  started = true;
  if (Platform.OS === "web") return;
  void setVideoCacheSizeAsync(FEED_VIDEO_CACHE_BYTES).catch(() => {
    /* Expo Go / unsupported native — progressive download still works */
  });
}
