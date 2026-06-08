import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY = "dh_access_token";

const isWeb = Platform.OS === "web";

/**
 * AFTER_FIRST_UNLOCK: survives brief background/lock on Android better than WHEN_UNLOCKED,
 * which can return null right after the app resumes and trigger a false logout.
 */
const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK
};

/** Persist JWT — survives app restart and device reboot (SecureStore / localStorage). */
export async function setToken(token: string): Promise<void> {
  const trimmed = token?.trim();
  if (!trimmed) {
    throw new Error("Cannot store empty token");
  }

  if (isWeb && typeof localStorage !== "undefined") {
    localStorage.setItem(KEY, trimmed);
    return;
  }

  await SecureStore.setItemAsync(KEY, trimmed, secureOptions);
}

export async function getToken(): Promise<string | null> {
  try {
    if (isWeb && typeof localStorage !== "undefined") {
      const v = localStorage.getItem(KEY);
      return v?.trim() || null;
    }
    const v = await SecureStore.getItemAsync(KEY, secureOptions);
    return v?.trim() || null;
  } catch {
    return null;
  }
}

/** Retry once after resume — SecureStore can be briefly unavailable on Android. */
export async function getTokenReliable(): Promise<string | null> {
  const first = await getToken();
  if (first || isWeb) return first;
  await new Promise((r) => setTimeout(r, 150));
  return getToken();
}

export async function hasToken(): Promise<boolean> {
  const t = await getToken();
  return !!t;
}

export async function clearToken(): Promise<void> {
  try {
    if (isWeb && typeof localStorage !== "undefined") {
      localStorage.removeItem(KEY);
      return;
    }
    await SecureStore.deleteItemAsync(KEY, secureOptions);
  } catch {
    // ignore — best effort
  }
}
