import { TextStyle } from "react-native";
import { fonts } from "./fonts";

export const typography = {
  hero: {
    fontFamily: fonts.bold,
    fontSize: 26,
    fontWeight: "700" as const,
    lineHeight: 32
  },
  h1: {
    fontFamily: fonts.bold,
    fontSize: 22,
    fontWeight: "700" as const,
    lineHeight: 28
  },
  h2: {
    fontFamily: fonts.semiBold,
    fontSize: 19,
    fontWeight: "600" as const,
    lineHeight: 25
  },
  h3: {
    fontFamily: fonts.semiBold,
    fontSize: 17,
    fontWeight: "600" as const,
    lineHeight: 23
  },
  feedUsername: {
    fontFamily: fonts.bold,
    fontSize: 15,
    fontWeight: "700" as const,
    lineHeight: 19,
    letterSpacing: -0.25
  },
  feedTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    fontWeight: "700" as const,
    lineHeight: 19,
    letterSpacing: -0.2
  },
  feedCaption: {
    fontFamily: fonts.regular,
    fontSize: 12,
    fontWeight: "400" as const,
    lineHeight: 17,
    letterSpacing: -0.05
  },
  feedMeta: {
    fontFamily: fonts.medium,
    fontSize: 12,
    fontWeight: "500" as const,
    lineHeight: 16
  },
  feedCount: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    fontWeight: "600" as const,
    lineHeight: 15
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    fontWeight: "400" as const,
    lineHeight: 23
  },
  bodySmall: {
    fontFamily: fonts.regular,
    fontSize: 13,
    fontWeight: "400" as const,
    lineHeight: 19
  },
  caption: {
    fontFamily: fonts.regular,
    fontSize: 12,
    fontWeight: "400" as const,
    lineHeight: 16
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 13,
    fontWeight: "500" as const,
    lineHeight: 19
  },
  button: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    fontWeight: "600" as const
  },
  buttonSmall: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    fontWeight: "600" as const
  }
} as const satisfies Record<string, TextStyle>;
