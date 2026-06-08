import { useEffect, useState } from "react";
import { Dimensions, Keyboard, Platform, type KeyboardEvent } from "react-native";

/** How much of the app window the keyboard covers from the bottom (px). */
function keyboardOverlapPx(e: KeyboardEvent): number {
  const reported = e.endCoordinates.height;
  if (Platform.OS !== "android") return reported;

  const windowHeight = Dimensions.get("window").height;
  const screenHeight = Dimensions.get("screen").height;
  const keyboardTopY = e.endCoordinates.screenY;
  const windowTopY = screenHeight - windowHeight;
  const overlap = windowHeight - (keyboardTopY - windowTopY);

  if (Number.isFinite(overlap) && overlap > 0) {
    return Math.max(reported, overlap);
  }
  return reported;
}

/** Software keyboard overlap in px (0 when hidden). */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setHeight(keyboardOverlapPx(e));
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}
