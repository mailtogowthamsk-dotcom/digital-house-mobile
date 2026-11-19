import React, { type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  View,
  type StyleProp,
  type ViewStyle
} from "react-native";
import { useKeyboardHeight } from "../../hooks/useKeyboardHeight";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  keyboardVerticalOffset?: number;
  /**
   * When true (default), Android pads only by leftover after adjustResize.
   * useKeyboardHeight is resize-safe (0 until window shrink is observed).
   */
  androidPad?: boolean;
};

/**
 * Screen-level keyboard avoidance for forms / composers.
 * Prefer this over raw KeyboardAvoidingView with Android behavior=undefined.
 *
 * IMPORTANT: Always keep a stable child View. Conditionally swapping
 * `children` ↔ `<View>{children}</View>` remounts TextInputs on Android
 * when the keyboard opens and immediately dismisses the keyboard.
 */
export function AppKeyboardAvoidingView({
  children,
  style,
  keyboardVerticalOffset = 0,
  androidPad = true
}: Props) {
  const keyboardHeight = useKeyboardHeight();
  const androidInset =
    androidPad && Platform.OS === "android" && keyboardHeight > 0 ? keyboardHeight : 0;

  return (
    <KeyboardAvoidingView
      style={style}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <View style={{ flex: 1, paddingBottom: androidInset }}>{children}</View>
    </KeyboardAvoidingView>
  );
}
