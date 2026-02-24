import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY = "dh_theme";

const isWeb = Platform.OS === "web";

export type ThemeMode = "light" | "dark";

export async function getStoredTheme(): Promise<ThemeMode | null> {
  try {
    if (isWeb && typeof localStorage !== "undefined") {
      const v = localStorage.getItem(KEY);
      return v === "dark" || v === "light" ? v : null;
    }
    const v = await SecureStore.getItemAsync(KEY);
    return v === "dark" || v === "light" ? v : null;
  } catch {
    return null;
  }
}

export async function setStoredTheme(mode: ThemeMode): Promise<void> {
  try {
    if (isWeb && typeof localStorage !== "undefined") {
      localStorage.setItem(KEY, mode);
      return;
    }
    await SecureStore.setItemAsync(KEY, mode);
  } catch {
    // Ignore storage errors
  }
}
