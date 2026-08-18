import { Platform } from "react-native";

/**
 * Shared FlatList virtualization knobs for feed-like surfaces.
 *
 * windowSize 5 + unmounting images caused recycle flicker on Android.
 * Keep a modest window so fast fling does not blank cards, without mounting
 * the entire feed. removeClippedSubviews is iOS-only — on Android it punches
 * holes / flashes expo-image cells.
 */
export const FEED_FLATLIST_PERF = {
  windowSize: 9,
  maxToRenderPerBatch: 3,
  updateCellsBatchingPeriod: 70,
  initialNumToRender: 3,
  removeClippedSubviews: Platform.OS === "ios",
  scrollEventThrottle: 48
};

export const THREAD_FLATLIST_PERF = {
  windowSize: 9,
  maxToRenderPerBatch: 12,
  updateCellsBatchingPeriod: 50,
  initialNumToRender: 12,
  removeClippedSubviews: true as const
};
