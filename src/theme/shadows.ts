import { Platform, ViewStyle } from "react-native";

/** Subtle card elevation — prefer over heavy shadows. */
export function cardShadow(mode: "light" | "dark" = "light"): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: mode === "dark" ? "#000000" : "#111827",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: mode === "dark" ? 0.28 : 0.06,
      shadowRadius: 12
    },
    android: { elevation: mode === "dark" ? 3 : 2 },
    default: {}
  }) as ViewStyle;
}

/** Soft elevated surface (modals, login card). */
export function elevatedShadow(mode: "light" | "dark" = "light"): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: mode === "dark" ? "#000000" : "#111827",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: mode === "dark" ? 0.35 : 0.1,
      shadowRadius: 20
    },
    android: { elevation: mode === "dark" ? 8 : 6 },
    default: {}
  }) as ViewStyle;
}

/** Bottom nav / dock top edge. */
export function navShadow(mode: "light" | "dark" = "light"): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: mode === "dark" ? "#000000" : "#111827",
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: mode === "dark" ? 0.35 : 0.06,
      shadowRadius: 8
    },
    android: { elevation: 8 },
    default: {}
  }) as ViewStyle;
}
