import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useIsFocused } from "@react-navigation/native";

/**
 * Run callback when app returns to foreground while THIS screen is focused.
 * Mounted-but-unfocused screens (e.g. Home under Chat) do not refresh.
 * Delayed slightly so network + SecureStore are ready on Android.
 */
export function useAppResume(callback: () => void, enabled = true, delayMs = 500) {
  const isFocused = useIsFocused();
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const effective = enabled && isFocused;

  useEffect(() => {
    if (!effective) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onChange = (next: AppStateStatus) => {
      if (next !== "active") return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => callbackRef.current(), delayMs);
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => {
      if (timer) clearTimeout(timer);
      sub.remove();
    };
  }, [effective, delayMs]);
}
