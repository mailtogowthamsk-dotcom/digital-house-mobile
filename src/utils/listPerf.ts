/**
 * Shared FlatList virtualization knobs for feed-like surfaces.
 *
 * windowSize 5 + unmounting images caused recycle flicker on Android.
 * Keep a modest window so fast fling does not blank cards, without mounting
 * the entire feed.
 *
 * Never enable removeClippedSubviews here: Android punches holes in expo-image
 * cells, and iOS detaches VideoView/AVPlayer so HEVC/MOV clips stall after
 * scroll-away (first play works, coming back shows a frozen poster).
 */
export const FEED_FLATLIST_PERF = {
  windowSize: 9,
  maxToRenderPerBatch: 3,
  updateCellsBatchingPeriod: 70,
  initialNumToRender: 3,
  removeClippedSubviews: false as const,
  scrollEventThrottle: 48
};

export const THREAD_FLATLIST_PERF = {
  windowSize: 9,
  maxToRenderPerBatch: 12,
  updateCellsBatchingPeriod: 50,
  initialNumToRender: 12,
  removeClippedSubviews: true as const
};
