import React, { useEffect, useRef, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle
} from "react-native";
import { useKeyboardHeight } from "../../hooks/useKeyboardHeight";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  keyboardVerticalOffset?: number;
  /**
   * When true (default), Android also pads by keyboard leftover after
   * adjustResize — needed with edge-to-edge where resize is incomplete.
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
  const { height } = useWindowDimensions();
  const heightBeforeKeyboardRef = useRef(height);
  const keyboardVisible = keyboardHeight > 0;

  useEffect(() => {
    if (!keyboardVisible) {
      heightBeforeKeyboardRef.current = height;
    }
  }, [height, keyboardVisible]);

  const windowShrunkBy = keyboardVisible
    ? Math.max(0, heightBeforeKeyboardRef.current - height)
    : 0;

  const androidInset =
    androidPad && Platform.OS === "android" && keyboardVisible
      ? Math.max(0, keyboardHeight - windowShrunkBy)
      : 0;

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
