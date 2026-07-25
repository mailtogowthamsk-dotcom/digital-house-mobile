import { TextStyle } from "react-native";

export const typography = {
  hero: {
    fontSize: 26,
    fontWeight: "800" as const,
    lineHeight: 32
  },
  h1: {
    fontSize: 24,
    fontWeight: "700" as const,
    lineHeight: 30
  },
  h2: {
    fontSize: 20,
    fontWeight: "700" as const,
    lineHeight: 26
  },
  h3: {
    fontSize: 18,
    fontWeight: "600" as const,
    lineHeight: 24
  },
  feedUsername: {
    fontSize: 16,
    fontWeight: "700" as const,
    lineHeight: 20,
    letterSpacing: -0.25
  },
  feedTitle: {
    fontSize: 17,
    fontWeight: "600" as const,
    lineHeight: 24,
    letterSpacing: -0.2
  },
  feedCaption: {
    fontSize: 15,
    fontWeight: "400" as const,
    lineHeight: 22,
    letterSpacing: -0.05
  },
  feedMeta: {
    fontSize: 13,
    fontWeight: "500" as const,
    lineHeight: 17
  },
  feedCount: {
    fontSize: 13,
    fontWeight: "600" as const,
    lineHeight: 16
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 24
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: "400" as const,
    lineHeight: 20
  },
  caption: {
    fontSize: 12,
    fontWeight: "500" as const,
    lineHeight: 16
  },
  label: {
    fontSize: 14,
    fontWeight: "600" as const,
    lineHeight: 20
  },
  button: {
    fontSize: 16,
    fontWeight: "700" as const
  },
  buttonSmall: {
    fontSize: 14,
    fontWeight: "600" as const
  }
} as const satisfies Record<string, TextStyle>;
