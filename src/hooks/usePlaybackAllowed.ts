import { useCallback, useEffect, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useIsFocused } from "@react-navigation/native";

/**
 * Central gate for media autoplay (feed / profile / detail).
 *
 * Playback is allowed only when:
 * - the hosting screen is focused in React Navigation
 * - the app is in the foreground (`AppState === "active"`)
 *
 * Use inside video players so leaving Home (or any screen) always stops
 * audio/video even when the screen stays mounted under a stack push.
 */
/**
 * On a cold start `AppState.currentState` can still be "unknown"/null, and no
 * "change" event follows while the app stays foregrounded — treating that as
 * inactive would block autoplay for the whole session.
 */
function isForeground(state: AppStateStatus | null | undefined): boolean {
  return state !== "background" && state !== "inactive";
}

export function usePlaybackAllowed(): boolean {
  const isFocused = useIsFocused();
  const [appActive, setAppActive] = useState(() => isForeground(AppState.currentState));

  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      setAppActive(isForeground(next));
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, []);

  return isFocused && appActive;
}

/**
 * Prefer pausing videos on blur without clearing the active media id.
 * FlatList often does not re-fire viewability when a screen regains focus,
 * so clearing the id leaves a dead poster with a non-interactive play button.
 * Keep the active id mounted and gate playback with `usePlaybackAllowed`.
 */
export function useClearActiveMediaOnBlur(clear: () => void): void {
  const isFocused = useIsFocused();
  const clearRef = useCallback(clear, [clear]);

  useEffect(() => {
    if (!isFocused) clearRef();
  }, [isFocused, clearRef]);
}
