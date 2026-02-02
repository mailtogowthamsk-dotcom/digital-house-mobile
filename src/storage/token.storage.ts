import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY = "dh_access_token";

/** On web, SecureStore is not supported – use localStorage so /home/summary etc. get the JWT. */
const isWeb = Platform.OS === "web";

export async function setToken(token: string) {
  try {
    if (isWeb && typeof localStorage !== "undefined") {
      localStorage.setItem(KEY, token);
      return;
    }
    await SecureStore.setItemAsync(KEY, token);
  } catch {
    // Avoid crash on Android if SecureStore fails (e.g. keystore not ready)
  }
}

export async function getToken() {
  try {
    if (isWeb && typeof localStorage !== "undefined") {
      return localStorage.getItem(KEY);
    }
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function clearToken() {
  try {
    if (isWeb && typeof localStorage !== "undefined") {
      localStorage.removeItem(KEY);
      return;
    }
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    // Avoid crash on Android
  }
}

