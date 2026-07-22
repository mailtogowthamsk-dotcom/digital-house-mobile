/**
 * Lightweight registry of active feed video players.
 * Enables a single pause-all for navigation / background without
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
  for (const pause of [...players]) {
    try {
      pause();
    } catch {
      /* ignore */
    }
  }
}

/** How many native feed players are currently registered (debug / tests). */
export function getRegisteredFeedVideoPlayerCount(): number {
  return players.size;
}
