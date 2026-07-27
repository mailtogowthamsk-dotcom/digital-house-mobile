/**
 * Shared FlatList virtualization knobs for feed-like surfaces.
 * Tuned for short-form social scroll (≈60 FPS, low memory).
 */
export const FEED_FLATLIST_PERF = {
  windowSize: 7,
  maxToRenderPerBatch: 8,
  updateCellsBatchingPeriod: 50,
  initialNumToRender: 6,
  removeClippedSubviews: true as const
};

export const THREAD_FLATLIST_PERF = {
  windowSize: 9,
  maxToRenderPerBatch: 12,
  updateCellsBatchingPeriod: 50,
  initialNumToRender: 12,
  removeClippedSubviews: true as const
};
