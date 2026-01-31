import { TextStyle } from "react-native";

export const typography = {
  /** Large hero / landing headline */
  hero: {
    fontSize: 26,
    fontWeight: "800" as const,
    lineHeight: 32
  },
  /** Screen title */
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
  /** Body */
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
  /** Labels, captions */
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
  /** Buttons */
  button: {
    fontSize: 16,
    fontWeight: "700" as const
  },
  buttonSmall: {
    fontSize: 14,
    fontWeight: "600" as const
  }
} as const satisfies Record<string, TextStyle>;
