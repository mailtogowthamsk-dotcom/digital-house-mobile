import * as SecureStore from "expo-secure-store";
import { isRemotePushSupported, syncPushTokenWithBackend } from "../services/pushNotifications";
import { ensurePushNotifications, getPushPermissionStatus } from "./notifications";

const PROMPT_KEY = "dh_push_soft_prompt_v1";

/**
 * Soft-prompt for push after meaningful use (e.g. opening Notification Center).
 * Runs at most once per install. Never called from app launch / auth bootstrap.
 */
export async function maybePromptPushAfterMeaningfulUse(): Promise<void> {
  if (!isRemotePushSupported()) return;

  try {
    const already = await SecureStore.getItemAsync(PROMPT_KEY);
    if (already === "1") return;
  } catch {
    return;
  }

  const status = await getPushPermissionStatus();
  if (
    status.outcome === "granted" ||
    status.outcome === "limited" ||
    status.outcome === "unavailable" ||
    status.outcome === "blocked" ||
    status.outcome === "restricted"
  ) {
    try {
      await SecureStore.setItemAsync(PROMPT_KEY, "1");
    } catch {
      /* ignore */
    }
    return;
  }

  const result = await ensurePushNotifications();
  try {
    await SecureStore.setItemAsync(PROMPT_KEY, "1");
  } catch {
    /* ignore */
  }

  if (result.ok) {
    void syncPushTokenWithBackend(true, { requestIfNeeded: false });
  }
}
