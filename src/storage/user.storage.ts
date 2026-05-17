import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { MeUser } from "../api/auth.api";

const KEY = "dh_user_snapshot";

const isWeb = Platform.OS === "web";

const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED
};

export async function setUserSnapshot(user: MeUser): Promise<void> {
  const json = JSON.stringify(user);
  if (isWeb && typeof localStorage !== "undefined") {
    localStorage.setItem(KEY, json);
    return;
  }
  await SecureStore.setItemAsync(KEY, json, secureOptions);
}

export async function getUserSnapshot(): Promise<MeUser | null> {
  try {
    let raw: string | null = null;
    if (isWeb && typeof localStorage !== "undefined") {
      raw = localStorage.getItem(KEY);
    } else {
      raw = await SecureStore.getItemAsync(KEY, secureOptions);
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MeUser;
    if (!parsed?.id || !parsed?.status) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearUserSnapshot(): Promise<void> {
  try {
    if (isWeb && typeof localStorage !== "undefined") {
      localStorage.removeItem(KEY);
      return;
    }
    await SecureStore.deleteItemAsync(KEY, secureOptions);
  } catch {
    // ignore
  }
}
