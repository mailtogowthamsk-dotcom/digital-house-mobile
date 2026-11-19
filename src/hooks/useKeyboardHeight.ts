import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Keyboard,
  Platform,
  useWindowDimensions,
  type KeyboardEvent
} from "react-native";

/**
 * Full IME height from the bottom of the screen (px).
 * Use for Android Modals/Dialogs that ignore adjustResize.
 */
function keyboardScreenOverlapPx(e: KeyboardEvent): number {
  const reported = e.endCoordinates?.height ?? 0;
  const screenHeight = Dimensions.get("screen").height;
  const keyboardTopY = e.endCoordinates?.screenY;
  const fromScreenBottom =
    typeof keyboardTopY === "number" ? Math.max(0, screenHeight - keyboardTopY) : 0;
  return Math.max(reported, fromScreenBottom);
}

function useKeyboardMetric(measure: (e: KeyboardEvent) => number): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    const apply = (e: KeyboardEvent) => {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      setHeight(measure(e));
    };

    const showSub = Keyboard.addListener(showEvent, apply);
    const hideSub = Keyboard.addListener(hideEvent, () => {
      // Gboard emoji / sticker panels fire hide without unfocusing the field.
      if (Platform.OS === "android") {
        hideTimer = setTimeout(() => {
          hideTimer = null;
          setHeight(0);
        }, 160);
        return;
      }
      setHeight(0);
    });
    const willChangeSub =
      Platform.OS === "ios" ? Keyboard.addListener("keyboardWillChangeFrame", apply) : null;
    const didChangeSub = Keyboard.addListener("keyboardDidChangeFrame", apply);

    return () => {
      if (hideTimer) clearTimeout(hideTimer);
      showSub.remove();
      hideSub.remove();
      willChangeSub?.remove();
      didChangeSub.remove();
    };
  }, [measure]);

  return height;
}

/**
 * Full IME height from the screen bottom.
 * Android Modals need this — they do not receive adjustResize.
 */
export function useKeyboardScreenHeight(): number {
  return useKeyboardMetric(keyboardScreenOverlapPx);
}

/**
 * Inset for normal screens (not Modals).
 *
 * iOS: full keyboard height (keyboard overlays the window).
 * Android: app uses softwareKeyboardLayoutMode "resize", so the window already
 * shrinks. We only return the leftover AFTER resize is observed.
 *
 * Why every page broke: older math often reported the FULL IME height while
 * resize also shrank the window → double pad → blank band above the keyboard
 * (Login, OTP, Chat, etc.). Live store builds sometimes got leftover≈0 by luck;
 * Expo Go + edge-to-edge hits the race every time.
 */
export function useKeyboardHeight(): number {
  const ime = useKeyboardMetric(keyboardScreenOverlapPx);
  const { height } = useWindowDimensions();
  const baselineRef = useRef(height);
  const [androidLeftover, setAndroidLeftover] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    if (ime <= 0) {
      // Keep the tallest height seen while the keyboard is closed as baseline.
      // (Do NOT overwrite with a mid-resize height — that was the race bug.)
      baselineRef.current = Math.max(baselineRef.current, height);
      setAndroidLeftover(0);
      return;
    }

    const shrunkBy = Math.max(0, baselineRef.current - height);

    // Resize has not landed yet: return 0 so we do not double-pad.
    // Once the window shrinks, report only the true leftover.
    if (shrunkBy < 24) {
      setAndroidLeftover(0);
      return;
    }

    setAndroidLeftover(Math.max(0, ime - shrunkBy));
  }, [ime, height]);

  if (Platform.OS === "ios") return ime;
  return androidLeftover;
}

/**
 * Bottom padding for docked composers.
 * Android value is already resize-safe leftover from useKeyboardHeight.
 */
export function useKeyboardComposerInset(inputFocused: boolean): {
  keyboardHeight: number;
  inset: number;
} {
  const keyboardHeight = useKeyboardHeight();
  const lastKeyboardHeightRef = useRef(0);

  useEffect(() => {
    if (keyboardHeight > 0) {
      lastKeyboardHeightRef.current = keyboardHeight;
    }
  }, [keyboardHeight]);

  const androidEmojiFloor =
    Platform.OS === "android" &&
    inputFocused &&
    keyboardHeight === 0 &&
    lastKeyboardHeightRef.current > 0
      ? lastKeyboardHeightRef.current
      : 0;

  const inset =
    Platform.OS === "ios"
      ? keyboardHeight
      : Math.max(keyboardHeight, androidEmojiFloor);

  return { keyboardHeight, inset };
}
