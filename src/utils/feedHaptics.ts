import { Platform } from "react-native";

export async function hapticLike(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const Haptics = await import("expo-haptics");
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    // simulator
  }
}

export async function hapticComment(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const Haptics = await import("expo-haptics");
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // ignore
  }
}

export async function hapticSave(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const Haptics = await import("expo-haptics");
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // ignore
  }
}
