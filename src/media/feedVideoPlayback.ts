/**
 * Lightweight registry of active feed video players.
 * Enables a single pause-all for future Reels/Stories controllers without
 * coupling screens to expo-video internals.
 */

type PauseHandle = () => void;

const players = new Set<PauseHandle>();

export function registerFeedVideoPlayer(pause: PauseHandle): () => void {
  players.add(pause);
  return () => {
    players.delete(pause);
  };
}

/** Pause every registered feed video (navigation / app background safety net). */
export function pauseAllFeedVideos(): void {
  for (const pause of players) {
    try {
      pause();
    } catch {
      /* ignore */
    }
  }
}
