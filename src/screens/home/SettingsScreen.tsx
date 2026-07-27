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
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences
} from "../../api/notifications.api";
import {
  updateConnectionRequests
} from "../../api/users.api";
import { useAuth } from "../../context/AuthContext";
import {
  isExpoGo,
  isRemotePushSupported,
  requestPushPermissions,
  syncPushTokenWithBackend
} from "../../services/pushNotifications";
import { getLinkedAccounts, type LinkedAccountsResponse } from "../../api/auth.api";
import { appAlert } from "../../utils/appAlert";

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { mode, setMode, colors } = useTheme();
  const { user, refreshSession } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [linked, setLinked] = useState<LinkedAccountsResponse | null>(null);
  const [loadingLinked, setLoadingLinked] = useState(true);
  const [acceptingRequests, setAcceptingRequests] = useState(user?.allowConnectionRequests !== false);

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

  useEffect(() => {
    void (async () => {
      setLoadingLinked(true);
      try {
        setLinked(await getLinkedAccounts());
      } catch {
        setLinked(null);
      } finally {
        setLoadingLinked(false);
      }
    })();
  }, []);

  useEffect(() => {
    setAcceptingRequests(user?.allowConnectionRequests !== false);
  }, [user?.allowConnectionRequests]);

  const patchConnectionRequests = async (value: boolean) => {
    const prev = acceptingRequests;
    setAcceptingRequests(value);
    try {
      await updateConnectionRequests(value);
      await refreshSession();
    } catch {
      setAcceptingRequests(prev);
    }
  };

  const patch = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!prefs) return;

    // Turning push ON: ask for OS permission when device push is supported.
    // Always still persist the preference so on/off works (including Expo Go).
    if (key === "pushEnabled" && value) {
      if (!isRemotePushSupported()) {
        // Preference can still be saved; device alerts need a real build.
      } else {
        const granted = await requestPushPermissions();
        if (!granted) {
          appAlert(
            "Permission needed",
            "Enable notifications in your phone settings to receive push alerts."
          );
          return;
        }
      }
    }

    const prev = prefs;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try {
      const saved = await updateNotificationPreferences({ [key]: value });
      setPrefs(saved);
      if (key === "pushEnabled" && value) {
        if (isRemotePushSupported()) {
          const synced = await syncPushTokenWithBackend(true);
          if (!synced) {
            appAlert(
              "Push preference saved",
              "Could not register this device for alerts yet. In-app notifications still work."
            );
          }
        } else if (isExpoGo()) {
          appAlert(
            "Push preference saved",
            "Device push alerts need a development build (npx expo run:android). In-app notifications still work in Expo Go."
          );
        }
      }
    } catch {
      setPrefs(prev);
      appAlert("Couldn't update", "Please try again.");
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
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Help</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Pressable
          style={({ pressed }) => [
            styles.row,
            { backgroundColor: pressed ? colors.surfaceElevated : colors.surface }
          ]}
          onPress={() => navigation.navigate("HelpSupport")}
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.surfaceElevated }]}>
            <Ionicons name="help-buoy-outline" size={22} color={colors.primary} />
          </View>
          <Text style={[styles.rowLabel, { color: colors.text }]}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: spacing.xl }]}>
        Account security
      </Text>
      {loadingLinked ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
      ) : (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.linkedHeading, { color: colors.text }]}>Linked accounts</Text>
          <LinkedRow
            label="Google"
            connected={linked?.googleConnected ?? false}
            colors={colors}
          />
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
          <LinkedRow
            label="Email OTP login"
            connected={linked?.existingLoginConnected ?? true}
            colors={colors}
          />
          <Text style={[styles.linkedHint, { color: colors.textMuted }]}>
            More sign-in options (e.g. Apple) can be added here in future updates.
          </Text>
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: spacing.xl }]}>
        Privacy
      </Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ToggleRow
          label="Accept connection requests"
          subtitle="When off, others cannot send you new connection requests"
          value={acceptingRequests}
          onValueChange={(v) => void patchConnectionRequests(v)}
          colors={colors}
        />
      </View>
      <Pressable
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            marginTop: spacing.md,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg
          }
        ]}
        onPress={() => navigation.navigate("Messages", { folder: "blocked" })}
      >
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Blocked members</Text>
            <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>
              Manage in Messages → Blocked
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </Pressable>

      <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: spacing.xl }]}>
        Appearance
      </Text>
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
            subtitle="Messages from connections and matrimony matches"
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
                ? "Saves your preference. Device alerts need a dev build — in-app alerts still work"
                : !isRemotePushSupported()
                  ? "Push alerts require a physical device"
                  : "Device alerts when app is closed (FCM / Expo)"
            }
            value={prefs.pushEnabled}
            onValueChange={(v) => void patch("pushEnabled", v)}
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

function LinkedRow({
  label,
  connected,
  colors
}: {
  label: string;
  connected: boolean;
  colors: import("../../theme/ThemeContext").ThemeColors;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.text, flex: 1 }]}>{label}</Text>
      {connected ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
          <Text style={{ color: "#16A34A", fontWeight: "700", fontSize: 13 }}>Connected</Text>
        </View>
      ) : (
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>Not linked</Text>
      )}
    </View>
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
  linkedHeading: {
    fontSize: 15,
    fontWeight: "800",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs
  },
  linkedHint: {
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg
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
