import { TextStyle } from "react-native";
import { fonts } from "./fonts";

export const typography = {
  hero: {
    fontFamily: fonts.bold,
    fontSize: 28,
    fontWeight: "700" as const,
    lineHeight: 34
  },
  h1: {
    fontFamily: fonts.bold,
    fontSize: 24,
    fontWeight: "700" as const,
    lineHeight: 30
  },
  h2: {
    fontFamily: fonts.semiBold,
    fontSize: 20,
    fontWeight: "600" as const,
    lineHeight: 26
  },
  h3: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    fontWeight: "600" as const,
    lineHeight: 24
  },
  feedUsername: {
    fontFamily: fonts.bold,
    fontSize: 16,
    fontWeight: "700" as const,
    lineHeight: 20,
    letterSpacing: -0.25
  },
  feedTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    fontWeight: "700" as const,
    lineHeight: 20,
    letterSpacing: -0.2
  },
  feedCaption: {
    fontFamily: fonts.regular,
    fontSize: 13,
    fontWeight: "400" as const,
    lineHeight: 18,
    letterSpacing: -0.05
  },
  feedMeta: {
    fontFamily: fonts.medium,
    fontSize: 13,
    fontWeight: "500" as const,
    lineHeight: 17
  },
  feedCount: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    fontWeight: "600" as const,
    lineHeight: 16
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 24
  },
  bodySmall: {
    fontFamily: fonts.regular,
    fontSize: 14,
    fontWeight: "400" as const,
    lineHeight: 20
  },
  caption: {
    fontFamily: fonts.regular,
    fontSize: 12,
    fontWeight: "400" as const,
    lineHeight: 16
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 14,
    fontWeight: "500" as const,
    lineHeight: 20
  },
  button: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    fontWeight: "600" as const
  },
  buttonSmall: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    fontWeight: "600" as const
  }
} as const satisfies Record<string, TextStyle>;
