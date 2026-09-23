/**
 * Seed unread counts from GET /home/bootstrap into NotificationProvider.
 * Supports late subscribers (provider may mount before bootstrap resolves).
 */
import type { UnreadCounts } from "../api/notifications.api";

type Listener = (counts: UnreadCounts) => void;

let seeded: UnreadCounts | null = null;
const listeners = new Set<Listener>();

export function seedStartupUnreadCounts(counts: UnreadCounts): void {
  seeded = counts;
  listeners.forEach((l) => l(counts));
}

export function subscribeStartupUnreadCounts(listener: Listener): () => void {
  listeners.add(listener);
  if (seeded) listener(seeded);
  return () => {
    listeners.delete(listener);
  };
}

export function takeStartupUnreadCounts(): UnreadCounts | null {
  const next = seeded;
  seeded = null;
  return next;
}
