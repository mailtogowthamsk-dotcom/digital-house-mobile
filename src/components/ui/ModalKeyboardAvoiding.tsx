import React, { type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  type StyleProp,
  type ViewStyle
} from "react-native";
import { useModalKeyboardPad } from "../../hooks/useModalKeyboardPad";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Extra iOS offset (e.g. status bar / header). */
  keyboardVerticalOffset?: number;
};

/**
 * Wrap bottom-sheet Modal content so the focused field stays above the keyboard.
 * - iOS: KeyboardAvoidingView padding
 * - Android: marginBottom = keyboard overlap (Modal ignores adjustResize)
 */
export function ModalKeyboardAvoiding({
  children,
  style,
  keyboardVerticalOffset = 0
}: Props) {
  const { sheetOffset } = useModalKeyboardPad();

  return (
    <KeyboardAvoidingView
      style={[styles.flex, style, sheetOffset > 0 ? { marginBottom: sheetOffset } : null]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { width: "100%" }
});
