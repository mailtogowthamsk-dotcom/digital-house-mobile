import { Platform } from "react-native";
import { useKeyboardHeight } from "./useKeyboardHeight";

/**
 * Android Modals / Dialog windows do not receive adjustResize, and
 * KeyboardAvoidingView often does nothing there — lift the sheet manually.
 * iOS should keep using KeyboardAvoidingView (padding); do not double-lift.
 */
export function useModalKeyboardPad() {
  const keyboardHeight = useKeyboardHeight();
  const keyboardOpen = keyboardHeight > 0;
  const sheetOffset = Platform.OS === "android" && keyboardOpen ? keyboardHeight : 0;

  return { keyboardHeight, keyboardOpen, sheetOffset };
}
