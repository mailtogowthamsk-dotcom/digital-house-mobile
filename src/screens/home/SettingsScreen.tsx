import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  ActivityIndicator
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences
} from "../../api/notifications.api";
import {
  isExpoGo,
  isRemotePushSupported,
  requestPushPermissions,
  syncPushTokenWithBackend
} from "../../services/pushNotifications";

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { mode, setMode, colors } = useTheme();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loadingPrefs, setLoadingPrefs] = useState(true);

  const loadPrefs = useCallback(async () => {
    setLoadingPrefs(true);
    try {
      setPrefs(await getNotificationPreferences());
    } catch {
      setPrefs(null);
    } finally {
      setLoadingPrefs(false);
    }
  }, []);

  useEffect(() => {
    void loadPrefs();
  }, [loadPrefs]);

  const patch = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!prefs) return;

    if (key === "pushEnabled" && value) {
      if (!isRemotePushSupported()) return;
      const granted = await requestPushPermissions();
      if (!granted) return;
    }

    const prev = prefs;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try {
      const saved = await updateNotificationPreferences({ [key]: value });
      setPrefs(saved);
      if (key === "pushEnabled" && value) {
        await syncPushTokenWithBackend(true);
      }
    } catch {
      setPrefs(prev);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + spacing.xxl
        }
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Appearance</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <OptionRow
          label="Light mode"
          icon="sunny-outline"
          selected={mode === "light"}
          onPress={() => setMode("light")}
          colors={colors}
        />
        <View style={[styles.separator, { backgroundColor: colors.border }]} />
        <OptionRow
          label="Dark mode"
          icon="moon-outline"
          selected={mode === "dark"}
          onPress={() => setMode("dark")}
          colors={colors}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: spacing.xl }]}>
        Notifications
      </Text>
      {loadingPrefs ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
      ) : prefs ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ToggleRow
            label="Social"
            subtitle="Likes, comments, mentions"
            value={prefs.socialEnabled}
            onValueChange={(v) => patch("socialEnabled", v)}
            colors={colors}
          />
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
          <ToggleRow
            label="Matrimony"
            subtitle="Interests, matches, profile updates"
            value={prefs.matrimonyEnabled}
            onValueChange={(v) => patch("matrimonyEnabled", v)}
            colors={colors}
            highlight
          />
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
          <ToggleRow
            label="Messages"
            subtitle="New chats and message requests"
            value={prefs.messagesEnabled}
            onValueChange={(v) => patch("messagesEnabled", v)}
            colors={colors}
          />
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
          <ToggleRow
            label="Community"
            subtitle="Announcements and events"
            value={prefs.communityEnabled}
            onValueChange={(v) => patch("communityEnabled", v)}
            colors={colors}
          />
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
          <ToggleRow
            label="System"
            subtitle="Account and platform updates"
            value={prefs.systemEnabled}
            onValueChange={(v) => patch("systemEnabled", v)}
            colors={colors}
          />
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
          <ToggleRow
            label="Push notifications"
            subtitle={
              isExpoGo()
                ? "Requires dev build (npx expo run:android) — not available in Expo Go"
                : "Device alerts when app is closed (FCM / Expo)"
            }
            value={prefs.pushEnabled}
            onValueChange={(v) => patch("pushEnabled", v)}
            colors={colors}
          />
        </View>
      ) : (
        <Text style={{ color: colors.textSecondary, marginBottom: spacing.lg }}>
          Could not load notification settings.
        </Text>
      )}
    </ScrollView>
  );
}

function OptionRow({
  label,
  icon,
  selected,
  onPress,
  colors
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  onPress: () => void;
  colors: import("../../theme/ThemeContext").ThemeColors;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? colors.surfaceElevated : colors.surface }
      ]}
      onPress={onPress}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.surfaceElevated }]}>
        <Ionicons name={icon as any} size={22} color={colors.primary} />
      </View>
      <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      {selected ? (
        <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
      ) : null}
    </Pressable>
  );
}

function ToggleRow({
  label,
  subtitle,
  value,
  onValueChange,
  colors,
  highlight
}: {
  label: string;
  subtitle: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  colors: import("../../theme/ThemeContext").ThemeColors;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.row, highlight && { backgroundColor: colors.surfaceElevated }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs
  },
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: "hidden"
  },
  separator: { height: 1, marginLeft: spacing.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center"
  },
  rowLabel: { flex: 1, fontSize: 16, fontWeight: "500" }
});
