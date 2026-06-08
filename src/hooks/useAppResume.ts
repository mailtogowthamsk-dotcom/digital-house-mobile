import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

/**
 * Run callback when app returns to foreground (e.g. after Realme battery sleep).
 * Delayed slightly so network + SecureStore are ready on Android.
 */
export function useAppResume(callback: () => void, enabled = true, delayMs = 500) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;
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
  }, [enabled, delayMs]);
}
