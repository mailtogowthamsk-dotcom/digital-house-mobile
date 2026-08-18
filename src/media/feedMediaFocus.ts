/**
 * Per-post media focus outside React tree.
 * Home/Explore viewability writes here; only cards whose flags change re-render.
 * Avoids extraData / renderItem identity churn on every active-video switch.
 */

import { useSyncExternalStore } from "react";

export type FeedMediaFocus = {
  activeId: string | null;
  preloadId: string | null;
  retainId: string | null;
};

const EMPTY: FeedMediaFocus = { activeId: null, preloadId: null, retainId: null };

let focus: FeedMediaFocus = EMPTY;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function getFeedMediaFocus(): FeedMediaFocus {
  return focus;
}

export function setFeedMediaFocus(next: FeedMediaFocus): void {
  if (
    focus.activeId === next.activeId &&
    focus.preloadId === next.preloadId &&
    focus.retainId === next.retainId
  ) {
    return;
  }
  focus = next;
  emit();
}

export function clearFeedMediaFocus(): void {
  setFeedMediaFocus(EMPTY);
}

export function subscribeFeedMediaFocus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Packed 0–7 so Object.is can skip rows whose flags did not change. */
function flagsSnapshot(postId: string): number {
  const current = focus;
  return (
    (current.activeId === postId ? 1 : 0) |
    (current.preloadId === postId ? 2 : 0) |
    (current.retainId === postId ? 4 : 0)
  );
}

export function useFeedMediaFlags(postId: string): {
  isMediaActive: boolean;
  isMediaPreload: boolean;
  isMediaRetain: boolean;
} {
  const snap = useSyncExternalStore(subscribeFeedMediaFocus, () => flagsSnapshot(postId));
  return {
    isMediaActive: (snap & 1) !== 0,
    isMediaPreload: (snap & 2) !== 0,
    isMediaRetain: (snap & 4) !== 0
  };
}
