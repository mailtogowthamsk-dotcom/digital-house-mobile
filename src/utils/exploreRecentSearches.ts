import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY = "explore_recent_searches_v1";
const MAX = 12;

const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK
};

const isWeb = Platform.OS === "web";

async function readRaw(): Promise<string | null> {
  if (isWeb && typeof localStorage !== "undefined") {
    return localStorage.getItem(KEY);
  }
  return SecureStore.getItemAsync(KEY, secureOptions);
}

async function writeRaw(value: string): Promise<void> {
  if (isWeb && typeof localStorage !== "undefined") {
    localStorage.setItem(KEY, value);
    return;
  }
  await SecureStore.setItemAsync(KEY, value, secureOptions);
}

async function clearRaw(): Promise<void> {
  if (isWeb && typeof localStorage !== "undefined") {
    localStorage.removeItem(KEY);
    return;
  }
  await SecureStore.deleteItemAsync(KEY, secureOptions);
}

export async function loadRecentSearches(): Promise<string[]> {
  try {
    const raw = await readRaw();
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map((x) => x.trim())
      .slice(0, MAX);
  } catch {
    return [];
  }
}

export async function pushRecentSearch(query: string): Promise<string[]> {
  const q = query.trim();
  if (!q) return loadRecentSearches();
  const prev = await loadRecentSearches();
  const next = [q, ...prev.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, MAX);
  await writeRaw(JSON.stringify(next));
  return next;
}

export async function clearRecentSearches(): Promise<void> {
  await clearRaw();
}

export async function removeRecentSearch(query: string): Promise<string[]> {
  const prev = await loadRecentSearches();
  const next = prev.filter((x) => x.toLowerCase() !== query.trim().toLowerCase());
  await writeRaw(JSON.stringify(next));
  return next;
}
