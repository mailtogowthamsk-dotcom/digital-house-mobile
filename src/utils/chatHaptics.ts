import { Platform } from "react-native";

/** Light tap when user sends a message (skipped on web). */
export async function hapticSendMessage(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const Haptics = await import("expo-haptics");
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // optional dependency / simulator
  }
}

/** Soft feedback when copying a message */
export async function hapticCopyMessage(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const Haptics = await import("expo-haptics");
    await Haptics.selectionAsync();
  } catch {
    // ignore
  }
}
