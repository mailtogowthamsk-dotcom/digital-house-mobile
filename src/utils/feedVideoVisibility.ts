import type { PostCardData } from "../components/home/PostCard";

export function isFeedVideoItem(item: PostCardData): boolean {
  return (
    item.mediaType === "video" ||
    Boolean(item.imageUri && /\.(mp4|mov|m4v)(\?|$)/i.test(item.imageUri))
  );
}

export type FeedMediaWindow = {
  /** Most visible / autoplay candidate */
  activeId: string | null;
  /** Next item — preload into disk cache */
  preloadId: string | null;
  /** Previous item — keep player reusable for instant scroll-back */
  retainId: string | null;
};

/**
 * Current + next + previous media window (Instagram-style reuse).
 */
export function pickActiveAndPreloadPostIds(
  viewableItems: Array<{ item: PostCardData; isViewable: boolean; index?: number | null }>,
  feedItems?: PostCardData[]
): FeedMediaWindow {
  const visible = viewableItems
    .filter((v) => v.isViewable)
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

  const activeId = visible[0]?.item.id ?? null;
  let preloadId: string | null = null;
  let retainId: string | null = null;

  if (activeId && feedItems && feedItems.length > 0) {
    const idx = feedItems.findIndex((i) => i.id === activeId);
    if (idx >= 0) {
      if (idx + 1 < feedItems.length) preloadId = feedItems[idx + 1]!.id;
      if (idx - 1 >= 0) retainId = feedItems[idx - 1]!.id;
    }
  } else if (visible.length > 1) {
    preloadId = visible[1]!.item.id;
  }

  if (preloadId === activeId) preloadId = null;
  if (retainId === activeId || retainId === preloadId) retainId = null;

  return { activeId, preloadId, retainId };
}

/** @deprecated Prefer pickActiveAndPreloadPostIds */
export function pickActiveAndPreloadVideoIds(
  viewableItems: Array<{ item: PostCardData; isViewable: boolean; index?: number | null }>,
  feedItems?: PostCardData[]
): FeedMediaWindow {
  return pickActiveAndPreloadPostIds(viewableItems, feedItems);
}
