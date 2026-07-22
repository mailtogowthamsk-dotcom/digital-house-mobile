/**
 * Feed-level audio preference (single source of truth).
 *
 * All feed / explore / member video players read and write this store.
 * Session-scoped: survives navigation (Feed → Chat → Feed) until process exit.
 * Default: muted (social-feed convention).
 */

type Listener = () => void;

let feedAudioMuted = true;
const listeners = new Set<Listener>();

function emit(): void {
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch {
      /* ignore subscriber errors */
    }
  }
}

/** Current global mute preference (true = muted). */
export function getFeedAudioMuted(): boolean {
  return feedAudioMuted;
}

/** Subscribe to mute preference changes. Returns unsubscribe. */
export function subscribeFeedAudioMuted(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Set the feed-wide mute preference. No-ops when unchanged. */
export function setFeedAudioMuted(muted: boolean): void {
  if (feedAudioMuted === muted) return;
  feedAudioMuted = muted;
  emit();
}

/** Toggle mute preference; returns the new muted value. */
export function toggleFeedAudioMuted(): boolean {
  setFeedAudioMuted(!feedAudioMuted);
  return feedAudioMuted;
}
