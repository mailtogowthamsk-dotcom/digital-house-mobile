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
export function usePlaybackAllowed(): boolean {
  const isFocused = useIsFocused();
  const [appActive, setAppActive] = useState(() => AppState.currentState === "active");

  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      setAppActive(next === "active");
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
