import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Keyboard,
  Platform,
  useWindowDimensions,
  type KeyboardEvent
} from "react-native";

/**
 * How much of the visible UI the keyboard covers from the bottom (px).
 * Uses both the event height and screen geometry — important for Android
 * Modals + edge-to-edge where adjustResize shrinks the activity window but
 * the Modal dialog still paints full-screen over the keyboard.
 */
function keyboardOverlapPx(e: KeyboardEvent): number {
  const reported = e.endCoordinates?.height ?? 0;
  const screenHeight = Dimensions.get("screen").height;
  const windowHeight = Dimensions.get("window").height;
  const keyboardTopY = e.endCoordinates?.screenY;

  const fromScreenBottom =
    typeof keyboardTopY === "number" ? Math.max(0, screenHeight - keyboardTopY) : 0;

  // Window may already be resized (adjustResize); measure overlap inside the window too.
  const windowTopY = Math.max(0, screenHeight - windowHeight);
  const fromWindow =
    typeof keyboardTopY === "number"
      ? Math.max(0, windowHeight - (keyboardTopY - windowTopY))
      : 0;

  if (Platform.OS === "android") {
    return Math.max(reported, fromScreenBottom, fromWindow);
  }

  return reported > 0 ? reported : Math.max(fromScreenBottom, fromWindow);
}

/** Software keyboard overlap in px (0 when hidden). */
export function useKeyboardHeight(): number {
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
      setHeight(keyboardOverlapPx(e));
    };

    const showSub = Keyboard.addListener(showEvent, apply);
    const hideSub = Keyboard.addListener(hideEvent, () => {
      // Gboard emoji / sticker panels fire hide without unfocusing the field.
      // Delay collapse so a following show/changeFrame can cancel it.
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
  }, []);

  return height;
}

/**
 * Bottom padding that keeps a docked composer above the IME.
 * Handles Android adjustResize leftover AND Gboard emoji (hide-without-blur).
 */
export function useKeyboardComposerInset(inputFocused: boolean): {
  keyboardHeight: number;
  inset: number;
} {
  const keyboardHeight = useKeyboardHeight();
  const { height } = useWindowDimensions();
  const heightBeforeKeyboardRef = useRef(height);
  const lastKeyboardHeightRef = useRef(0);

  const keyboardVisible = keyboardHeight > 0;

  useEffect(() => {
    if (!keyboardVisible) {
      heightBeforeKeyboardRef.current = height;
    }
  }, [height, keyboardVisible]);

  useEffect(() => {
    if (keyboardHeight > 0) {
      lastKeyboardHeightRef.current = keyboardHeight;
    }
  }, [keyboardHeight]);

  const windowShrunkBy = keyboardVisible
    ? Math.max(0, heightBeforeKeyboardRef.current - height)
    : 0;

  // Android emoji picker often overlays without a new keyboard event (or after a hide).
  // While the field is still focused, never drop below the last IME height / a Gboard floor.
  const androidEmojiFloor =
    Platform.OS === "android" &&
    inputFocused &&
    keyboardHeight === 0 &&
    lastKeyboardHeightRef.current > 0
      ? Math.max(lastKeyboardHeightRef.current, Math.round(height * 0.5))
      : 0;

  const effectiveHeight = Math.max(keyboardHeight, androidEmojiFloor);

  const inset =
    Platform.OS === "ios"
      ? effectiveHeight
      : Math.max(0, effectiveHeight - windowShrunkBy);

  return { keyboardHeight, inset };
}
