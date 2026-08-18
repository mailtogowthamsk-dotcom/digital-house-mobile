/**
 * Home feed ad-slot visibility without HomeScreen setState on scroll.
 * Crossing y≈240 notifies only PaidFeedAd / AdvertisementCard.
 */

import { useSyncExternalStore } from "react";

let visible = true;
const listeners = new Set<() => void>();

export function setFeedAdSlotVisible(next: boolean): void {
  if (visible === next) return;
  visible = next;
  listeners.forEach((listener) => listener());
}

export function subscribeFeedAdSlotVisible(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useFeedAdSlotVisible(): boolean {
  return useSyncExternalStore(subscribeFeedAdSlotVisible, () => visible);
}
