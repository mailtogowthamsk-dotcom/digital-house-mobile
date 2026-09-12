/**
 * Inter (preferred) — loaded via @expo-google-fonts/inter in App.tsx.
 * Roboto remains the Android system fallback if fonts fail to load.
 */
export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semiBold: "Inter_600SemiBold",
  bold: "Inter_700Bold"
} as const;

export type AppFontFamily = (typeof fonts)[keyof typeof fonts];
