/**
 * Lightweight registry of active feed video players.
 * Enables a single pause-all for navigation / background without
 * coupling screens to expo-video internals.
 */

type PauseHandle = () => void;

const players = new Map<object, PauseHandle>();

export function registerFeedVideoPlayer(key: object, pause: PauseHandle): () => void {
  players.set(key, pause);
  return () => {
    players.delete(key);
  };
}

/** Pause every registered feed video (navigation / app background safety net). */
export function pauseAllFeedVideos(): void {
  for (const pause of [...players.values()]) {
    try {
      pause();
    } catch {
      /* ignore */
    }
  }
}

/** Pause every registered feed video except the one about to play. */
export function pauseOtherFeedVideos(exceptKey: object): void {
  for (const [key, pause] of [...players.entries()]) {
    if (key === exceptKey) continue;
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
