import type { PostCardData } from "../components/home/PostCard";

export function isFeedVideoItem(item: PostCardData): boolean {
  return (
    item.mediaType === "video" ||
    Boolean(item.imageUri && /\.(mp4|mov|m4v)(\?|$)/i.test(item.imageUri))
  );
}

/**
 * From FlatList viewable items, pick the primary autoplay video and the next
 * video to warm (preload). Only one autoplays; preload never plays.
 *
 * If only one video is on screen, optionally look ahead in `feedItems` for the
 * next video below the active one (capped so far-off cells do not mount).
 */
const PRELOAD_LOOKAHEAD_MAX = 2;

export function pickActiveAndPreloadVideoIds(
  viewableItems: Array<{ item: PostCardData; isViewable: boolean; index?: number | null }>,
  feedItems?: PostCardData[]
): { activeId: string | null; preloadId: string | null } {
  const visibleVideos = viewableItems
    .filter((v) => v.isViewable && isFeedVideoItem(v.item))
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((v) => v.item.id);

  const activeId = visibleVideos[0] ?? null;
  let preloadId = visibleVideos.length > 1 ? visibleVideos[1]! : null;

  if (!preloadId && activeId && feedItems && feedItems.length > 0) {
    const idx = feedItems.findIndex((i) => i.id === activeId);
    if (idx >= 0) {
      const end = Math.min(feedItems.length, idx + 1 + PRELOAD_LOOKAHEAD_MAX);
      for (let i = idx + 1; i < end; i++) {
        const candidate = feedItems[i];
        if (candidate && isFeedVideoItem(candidate)) {
          preloadId = candidate.id;
          break;
        }
      }
    }
  }

  if (preloadId === activeId) preloadId = null;

  return { activeId, preloadId };
}
