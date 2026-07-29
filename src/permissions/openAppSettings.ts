import { Linking, Platform } from "react-native";

/** Opens the system Settings page for this app so the user can enable a blocked permission. */
export async function openAppSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch {
    if (Platform.OS === "ios") {
      await Linking.openURL("app-settings:").catch(() => undefined);
    }
  }
}
