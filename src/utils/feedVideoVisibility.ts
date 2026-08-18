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
  /** Previous item — keep paused native player for seamless scroll-back */
  retainId: string | null;
};

/**
 * Keep the previous *video* mounted (paused), not merely the previous feed
 * row. Image/job cards between two clips used to drop the decoder, so
 * scroll-back remounted AVPlayer and some HEVC/MOV files never left "loading".
 */
export function buildMediaWindow(
  activeId: string | null,
  feedItems?: PostCardData[]
): FeedMediaWindow {
  if (!activeId) {
    return { activeId: null, preloadId: null, retainId: null };
  }
  const items = feedItems ?? [];
  const idx = items.findIndex((i) => i.id === activeId);
  if (idx < 0) {
    return { activeId, preloadId: null, retainId: null };
  }

  const preloadId = idx + 1 < items.length ? items[idx + 1]!.id : null;
  let retainId: string | null = null;
  for (let i = idx - 1; i >= 0; i--) {
    if (isFeedVideoItem(items[i]!)) {
      retainId = items[i]!.id;
      break;
    }
  }

  return {
    activeId,
    preloadId: preloadId === activeId ? null : preloadId,
    retainId: retainId && retainId !== activeId && retainId !== preloadId ? retainId : null
  };
}

/**
 * Current + next + previous media window.
 * - active: playing decoder
 * - retain: paused decoder (instant reverse scroll, no remount flicker)
 * - preload: poster only (no third decoder / no parallel download)
 */
export function pickActiveAndPreloadPostIds(
  viewableItems: Array<{ item: PostCardData; isViewable: boolean; index?: number | null }>,
  feedItems?: PostCardData[]
): FeedMediaWindow {
  const visible = viewableItems
    .filter((v) => v.isViewable)
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

  const visibleVideo = visible.find((v) => isFeedVideoItem(v.item));
  const activeId = visibleVideo?.item.id ?? visible[0]?.item.id ?? null;

  if (activeId && feedItems && feedItems.length > 0) {
    return buildMediaWindow(activeId, feedItems);
  }

  const preloadId =
    visible.length > 1 && visible[1]!.item.id !== activeId ? visible[1]!.item.id : null;
  return { activeId, preloadId, retainId: null };
}

/** @deprecated Prefer pickActiveAndPreloadPostIds */
export function pickActiveAndPreloadVideoIds(
  viewableItems: Array<{ item: PostCardData; isViewable: boolean; index?: number | null }>,
  feedItems?: PostCardData[]
): FeedMediaWindow {
  return pickActiveAndPreloadPostIds(viewableItems, feedItems);
}
