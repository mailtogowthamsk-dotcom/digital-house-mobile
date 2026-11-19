import { Platform } from "react-native";
import { useKeyboardScreenHeight } from "./useKeyboardHeight";

/**
 * Android Modals / Dialog windows do not receive adjustResize, and
 * KeyboardAvoidingView often does nothing there — lift the sheet manually.
 * iOS should keep using KeyboardAvoidingView (padding); do not double-lift.
 * Uses screen IME height (not window leftover) because Modals paint full-screen.
 */
export function useModalKeyboardPad() {
  const keyboardHeight = useKeyboardScreenHeight();
  const keyboardOpen = keyboardHeight > 0;
  const sheetOffset = Platform.OS === "android" && keyboardOpen ? keyboardHeight : 0;

  return { keyboardHeight, keyboardOpen, sheetOffset };
}
