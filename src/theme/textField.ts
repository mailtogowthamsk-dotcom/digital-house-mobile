import { Platform, type TextStyle } from "react-native";

/**
 * TextInput metrics. Do not set `lineHeight` on TextInput — iOS clips
 * descenders (g, y, p, q) and vertically crowds the caret.
 */
const androidPad: TextStyle =
  Platform.OS === "android" ? { includeFontPadding: false } : {};

export const TEXT_FIELD_MIN_HEIGHT = 56;
export const TEXT_FIELD_COMPACT_MIN_HEIGHT = 48;

export const textFieldPad: TextStyle = {
  paddingTop: Platform.select({ ios: 16, default: 14 }),
  paddingBottom: Platform.select({ ios: 16, default: 14 }),
  textAlignVertical: "center",
  ...androidPad
};

export const textFieldCompactPad: TextStyle = {
  paddingTop: Platform.select({ ios: 12, default: 10 }),
  paddingBottom: Platform.select({ ios: 12, default: 10 }),
  textAlignVertical: "center",
  ...androidPad
};

/** Standard single-line field (login, forms). */
export const textField: TextStyle = {
  fontSize: 16,
  fontWeight: "400",
  minHeight: TEXT_FIELD_MIN_HEIGHT,
  ...textFieldPad
};

/** Search bars and compact filters. */
export const textFieldCompact: TextStyle = {
  fontSize: 15,
  fontWeight: "400",
  minHeight: TEXT_FIELD_COMPACT_MIN_HEIGHT,
  ...textFieldCompactPad
};

/** Multiline areas — keep extra top padding, align text to the top. */
export const textFieldMultiline: TextStyle = {
  fontSize: 16,
  fontWeight: "400",
  paddingTop: 14,
  paddingBottom: 14,
  textAlignVertical: "top",
  ...androidPad
};
