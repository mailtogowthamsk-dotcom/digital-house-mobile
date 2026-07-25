import { useEffect, useState } from "react";
import { Dimensions, Keyboard, Platform, type KeyboardEvent } from "react-native";

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

    const apply = (e: KeyboardEvent) => {
      setHeight(keyboardOverlapPx(e));
    };

    const showSub = Keyboard.addListener(showEvent, apply);
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setHeight(0);
    });
    const changeSub =
      Platform.OS === "ios"
        ? Keyboard.addListener("keyboardWillChangeFrame", apply)
        : null;

    return () => {
      showSub.remove();
      hideSub.remove();
      changeSub?.remove();
    };
  }, []);

  return height;
}
