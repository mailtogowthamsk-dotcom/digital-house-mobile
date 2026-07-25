/**
 * Soft, almost invisible post surface — content is the hero.
 */

import { Platform, ViewStyle } from "react-native";

export const feedRadius = {
  card: 16,
  media: 14,
  chip: 999,
  control: 14,
  nav: 28,
  avatar: 999
} as const;

export function feedCardShadow(mode: "light" | "dark"): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: mode === "dark" ? "#000000" : "#0F172A",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: mode === "dark" ? 0.22 : 0.03,
      shadowRadius: 8
    },
    android: {
      elevation: mode === "dark" ? 1 : 0
    },
    default: {}
  }) as ViewStyle;
}

export function feedNavShadow(mode: "light" | "dark"): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: mode === "dark" ? "#000000" : "#0F172A",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: mode === "dark" ? 0.45 : 0.1,
      shadowRadius: 28
    },
    android: {
      elevation: 12
    },
    default: {}
  }) as ViewStyle;
}

export function feedAvatarRing(mode: "light" | "dark"): ViewStyle {
  return {
    borderWidth: 1,
    borderColor: mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)",
    ...Platform.select({
      ios: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: mode === "dark" ? 0.2 : 0.04,
        shadowRadius: 2
      },
      android: { elevation: 0 },
      default: {}
    })
  };
}
