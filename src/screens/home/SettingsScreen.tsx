import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Platform,
  RefreshControl
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Constants from "expo-constants";
import { useTheme, type ThemeColors } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { Shimmer } from "../../components/ui/Shimmer";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences
} from "../../api/notifications.api";
import {
  updateConnectionRequests,
  getLastSeenVisibility,
  updateLastSeenVisibility,
  type LastSeenVisibility
} from "../../api/users.api";
import { useAuth } from "../../context/AuthContext";
import {
  isExpoGo,
  isRemotePushSupported,
  syncPushTokenWithBackend
} from "../../services/pushNotifications";
import { ensurePushNotifications } from "../../permissions";
import { getLinkedAccounts, type LinkedAccountsResponse } from "../../api/auth.api";
import {
  LEGAL_FALLBACK_LINKS,
  listLegalCatalog,
  type LegalCatalogItem
} from "../../api/legal.api";
import { appAlert } from "../../utils/appAlert";

type IconName = keyof typeof Ionicons.glyphMap;

const LAST_SEEN_OPTIONS: { value: LastSeenVisibility; label: string; hint: string }[] = [
  {
    value: "EVERYONE",
    label: "Everyone",
    hint: "Anyone chatting with you can see when you were last online"
  },
  {
    value: "MATCHES_ONLY",
    label: "Matches only",
    hint: "Only mutual matrimony matches. Other chats show “Last seen hidden”"
  },
  {
    value: "NOBODY",
    label: "Nobody",
    hint: "Others see “Last seen hidden” — including in chat"
  }
];

const LEGAL_ICONS: Record<string, IconName> = {
  privacy_policy: "lock-closed-outline",
  terms: "reader-outline",
  community_guidelines: "people-outline",
  refund_policy: "card-outline",
  account_deletion: "trash-outline",
  safety: "shield-checkmark-outline"
};

const TINTS = {
  blue: { fg: "#2563EB", bg: "#EFF6FF" },
  teal: { fg: "#0D9488", bg: "#F0FDFA" },
  violet: { fg: "#7C3AED", bg: "#F5F3FF" },
  amber: { fg: "#D97706", bg: "#FFFBEB" },
  rose: { fg: "#E11D48", bg: "#FFF1F2" },
  slate: { fg: "#0369A1", bg: "#F0F9FF" }
} as const;

type Tint = keyof typeof TINTS;

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
  const [lastSeenVisibility, setLastSeenVisibility] = useState<LastSeenVisibility>("MATCHES_ONLY");
  const [loadingLastSeen, setLoadingLastSeen] = useState(true);
  const [legalDocs, setLegalDocs] = useState<
    Array<Pick<LegalCatalogItem, "documentKey" | "title" | "slug"> & { version?: string }>
  >(LEGAL_FALLBACK_LINKS);
  const [loadingLegal, setLoadingLegal] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const loadLinked = useCallback(async () => {
    setLoadingLinked(true);
    try {
      setLinked(await getLinkedAccounts());
    } catch {
      setLinked(null);
    } finally {
      setLoadingLinked(false);
    }
  }, []);

  const loadLastSeen = useCallback(async () => {
    setLoadingLastSeen(true);
    try {
      setLastSeenVisibility(await getLastSeenVisibility());
    } catch {
      setLastSeenVisibility("MATCHES_ONLY");
    } finally {
      setLoadingLastSeen(false);
    }
  }, []);

  const loadLegal = useCallback(async () => {
    setLoadingLegal(true);
    try {
      const docs = await listLegalCatalog();
      setLegalDocs(docs.length > 0 ? docs : LEGAL_FALLBACK_LINKS);
    } catch {
      setLegalDocs(LEGAL_FALLBACK_LINKS);
    } finally {
      setLoadingLegal(false);
    }
  }, []);

  useEffect(() => {
    void loadPrefs();
    void loadLinked();
    void loadLastSeen();
    void loadLegal();
  }, [loadPrefs, loadLinked, loadLastSeen, loadLegal]);

  useEffect(() => {
    setAcceptingRequests(user?.allowConnectionRequests !== false);
  }, [user?.allowConnectionRequests]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadPrefs(), loadLinked(), loadLastSeen(), loadLegal()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadPrefs, loadLinked, loadLastSeen, loadLegal]);

  const patchLastSeenVisibility = async (value: LastSeenVisibility) => {
    const prev = lastSeenVisibility;
    setLastSeenVisibility(value);
    try {
      setLastSeenVisibility(await updateLastSeenVisibility(value));
    } catch {
      setLastSeenVisibility(prev);
      appAlert("Couldn't update", "Please try again.");
    }
  };

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
        const permission = await ensurePushNotifications();
        if (!permission.ok) return;
        void syncPushTokenWithBackend(true, { requestIfNeeded: false });
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

  const appVersion = Constants.expoConfig?.version ?? null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: insets.bottom + spacing.xxl }
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <SectionHeader label="Appearance" colors={colors} first />
      <View style={[styles.segment, { backgroundColor: colors.surfaceElevated }]}>
        {(["light", "dark"] as const).map((option) => {
          const active = mode === option;
          return (
            <Pressable
              key={option}
              onPress={() => setMode(option)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={option === "light" ? "Light mode" : "Dark mode"}
              style={[
                styles.segmentItem,
                active && { backgroundColor: colors.surface, borderColor: colors.border }
              ]}
            >
              <Ionicons
                name={option === "light" ? "sunny" : "moon"}
                size={16}
                color={active ? colors.primary : colors.textMuted}
              />
              <Text
                style={[
                  styles.segmentLabel,
                  { color: active ? colors.text : colors.textSecondary }
                ]}
              >
                {option === "light" ? "Light" : "Dark"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SectionHeader label="Notifications" colors={colors} />
      {loadingPrefs ? (
        <SkeletonCard colors={colors} rows={4} />
      ) : prefs ? (
        <Card colors={colors}>
          <ToggleRow
            icon="heart-outline"
            tint="rose"
            label="Social"
            subtitle="Likes, comments, mentions"
            value={prefs.socialEnabled}
            onValueChange={(v) => void patch("socialEnabled", v)}
            colors={colors}
            mode={mode}
          />
          <ToggleRow
            icon="rose-outline"
            tint="violet"
            label="Matrimony"
            subtitle="Interests, matches, profile updates"
            value={prefs.matrimonyEnabled}
            onValueChange={(v) => void patch("matrimonyEnabled", v)}
            colors={colors}
            mode={mode}
          />
          <ToggleRow
            icon="chatbubble-outline"
            tint="teal"
            label="Messages"
            subtitle="Messages from connections and matrimony matches"
            value={prefs.messagesEnabled}
            onValueChange={(v) => void patch("messagesEnabled", v)}
            colors={colors}
            mode={mode}
          />
          <ToggleRow
            icon="megaphone-outline"
            tint="amber"
            label="Community"
            subtitle="Announcements and events"
            value={prefs.communityEnabled}
            onValueChange={(v) => void patch("communityEnabled", v)}
            colors={colors}
            mode={mode}
          />
          <ToggleRow
            icon="settings-outline"
            tint="slate"
            label="System"
            subtitle="Account and platform updates"
            value={prefs.systemEnabled}
            onValueChange={(v) => void patch("systemEnabled", v)}
            colors={colors}
            mode={mode}
          />
          <ToggleRow
            icon="notifications-outline"
            tint="blue"
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
            mode={mode}
            isLast
          />
        </Card>
      ) : (
        <Card colors={colors}>
          <View style={styles.emptyRow}>
            <Ionicons name="cloud-offline-outline" size={20} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Could not load notification settings. Pull down to retry.
            </Text>
          </View>
        </Card>
      )}

      <SectionHeader label="Privacy" colors={colors} />
      <Card colors={colors}>
        <ToggleRow
          icon="person-add-outline"
          tint="blue"
          label="Accept connection requests"
          subtitle="When off, others cannot send you new connection requests"
          value={acceptingRequests}
          onValueChange={(v) => void patchConnectionRequests(v)}
          colors={colors}
          mode={mode}
        />
        <NavRow
          icon="ban-outline"
          tint="rose"
          label="Blocked members"
          subtitle="Manage in Messages → Blocked"
          onPress={() => navigation.navigate("Messages", { folder: "blocked" })}
          colors={colors}
          mode={mode}
          isLast
        />
      </Card>

      <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>Last seen</Text>
      {loadingLastSeen ? (
        <SkeletonCard colors={colors} rows={3} />
      ) : (
        <Card colors={colors}>
          {LAST_SEEN_OPTIONS.map((opt, idx) => {
            const selected = lastSeenVisibility === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => void patchLastSeenVisibility(opt.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.row,
                  styles.rowPlain,
                  { borderBottomColor: colors.border },
                  idx === LAST_SEEN_OPTIONS.length - 1 && styles.rowLast,
                  pressed && { backgroundColor: colors.surfaceElevated }
                ]}
              >
                <View style={styles.rowBody}>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>{opt.label}</Text>
                  <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>{opt.hint}</Text>
                </View>
                <Ionicons
                  name={selected ? "radio-button-on" : "radio-button-off"}
                  size={22}
                  color={selected ? colors.primary : colors.textMuted}
                />
              </Pressable>
            );
          })}
        </Card>
      )}

      <SectionHeader label="Account security" colors={colors} />
      {loadingLinked ? (
        <SkeletonCard colors={colors} rows={2} />
      ) : (
        <Card colors={colors}>
          <LinkedRow
            icon="logo-google"
            tint="rose"
            label="Google"
            connected={linked?.googleConnected ?? false}
            colors={colors}
            mode={mode}
          />
          <LinkedRow
            icon="mail-outline"
            tint="blue"
            label="Email OTP login"
            connected={linked?.existingLoginConnected ?? true}
            colors={colors}
            mode={mode}
            isLast
          />
        </Card>
      )}
      <Text style={[styles.footnote, { color: colors.textMuted }]}>
        More sign-in options (e.g. Apple) can be added here in future updates.
      </Text>

      <SectionHeader label="Help" colors={colors} />
      <Card colors={colors}>
        <NavRow
          icon="help-buoy-outline"
          tint="teal"
          label="Help & Support"
          subtitle="FAQs, guides and contact"
          onPress={() => navigation.navigate("HelpSupport")}
          colors={colors}
          mode={mode}
          isLast
        />
      </Card>

      <SectionHeader label="Legal" colors={colors} />
      {loadingLegal ? (
        <SkeletonCard colors={colors} rows={4} />
      ) : (
        <Card colors={colors}>
          <NavRow
            icon="library-outline"
            tint="violet"
            label="All legal documents"
            subtitle="Latest published policies"
            onPress={() => navigation.navigate("LegalIndex")}
            colors={colors}
            mode={mode}
            isLast={legalDocs.length === 0}
          />
          {legalDocs.map((doc, idx) => (
            <NavRow
              key={doc.documentKey}
              icon={LEGAL_ICONS[doc.documentKey] ?? "document-text-outline"}
              tint="slate"
              label={doc.title}
              subtitle={doc.version ? `Version ${doc.version}` : undefined}
              onPress={() =>
                navigation.navigate("LegalDocument", {
                  documentKey: doc.documentKey,
                  slug: doc.slug,
                  title: doc.title
                })
              }
              colors={colors}
              mode={mode}
              isLast={idx === legalDocs.length - 1}
            />
          ))}
        </Card>
      )}

      {appVersion ? (
        <Text style={[styles.version, { color: colors.textMuted }]}>Digital House v{appVersion}</Text>
      ) : null}
    </ScrollView>
  );
}

function SectionHeader({
  label,
  colors,
  first
}: {
  label: string;
  colors: ThemeColors;
  first?: boolean;
}) {
  return (
    <Text
      style={[
        styles.sectionTitle,
        { color: colors.textMuted },
        first && { marginTop: spacing.lg }
      ]}
    >
      {label}
    </Text>
  );
}

function Card({ colors, children }: { colors: ThemeColors; children: React.ReactNode }) {
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {children}
    </View>
  );
}

function IconChip({
  icon,
  tint,
  mode
}: {
  icon: IconName;
  tint: Tint;
  mode: "light" | "dark";
}) {
  const { fg, bg } = TINTS[tint];
  return (
    <View style={[styles.iconWrap, { backgroundColor: mode === "dark" ? `${fg}26` : bg }]}>
      <Ionicons name={icon} size={19} color={fg} />
    </View>
  );
}

function SkeletonCard({ colors, rows }: { colors: ThemeColors; rows: number }) {
  return (
    <Card colors={colors}>
      {Array.from({ length: rows }).map((_, idx) => (
        <View
          key={idx}
          style={[
            styles.row,
            { borderBottomColor: colors.border },
            idx === rows - 1 && styles.rowLast
          ]}
        >
          <Shimmer width={36} height={36} borderRadius={12} />
          <View style={styles.rowBody}>
            <Shimmer width="55%" height={13} />
            <Shimmer width="80%" height={10} style={{ marginTop: 6 }} />
          </View>
        </View>
      ))}
    </Card>
  );
}

function NavRow({
  icon,
  tint,
  label,
  subtitle,
  onPress,
  colors,
  mode,
  isLast
}: {
  icon: IconName;
  tint: Tint;
  label: string;
  subtitle?: string;
  onPress: () => void;
  colors: ThemeColors;
  mode: "light" | "dark";
  isLast?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.border },
        isLast && styles.rowLast,
        pressed && { backgroundColor: colors.surfaceElevated }
      ]}
    >
      <IconChip icon={icon} tint={tint} mode={mode} />
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        {subtitle ? (
          <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

function LinkedRow({
  icon,
  tint,
  label,
  connected,
  colors,
  mode,
  isLast
}: {
  icon: IconName;
  tint: Tint;
  label: string;
  connected: boolean;
  colors: ThemeColors;
  mode: "light" | "dark";
  isLast?: boolean;
}) {
  return (
    <View
      style={[styles.row, { borderBottomColor: colors.border }, isLast && styles.rowLast]}
    >
      <IconChip icon={icon} tint={tint} mode={mode} />
      <Text style={[styles.rowLabel, styles.rowBody, { color: colors.text }]}>{label}</Text>
      <View
        style={[
          styles.badge,
          {
            backgroundColor: connected
              ? mode === "dark"
                ? "rgba(34, 197, 94, 0.16)"
                : "#DCFCE7"
              : colors.surfaceElevated
          }
        ]}
      >
        <Text
          style={[styles.badgeText, { color: connected ? "#16A34A" : colors.textMuted }]}
        >
          {connected ? "Connected" : "Not linked"}
        </Text>
      </View>
    </View>
  );
}

function ToggleRow({
  icon,
  tint,
  label,
  subtitle,
  value,
  onValueChange,
  colors,
  mode,
  isLast
}: {
  icon: IconName;
  tint: Tint;
  label: string;
  subtitle: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  colors: ThemeColors;
  mode: "light" | "dark";
  isLast?: boolean;
}) {
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.border },
        isLast && styles.rowLast,
        pressed && { backgroundColor: colors.surfaceElevated }
      ]}
    >
      <IconChip icon={icon} tint={tint} mode={mode} />
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: colors.border,
          true: Platform.OS === "android" ? `${colors.primary}66` : colors.primary
        }}
        thumbColor={
          Platform.OS === "android" ? (value ? colors.primary : "#F8FAFC") : undefined
        }
        ios_backgroundColor={colors.border}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: "hidden"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 60,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  rowPlain: { paddingHorizontal: spacing.lg },
  rowLast: { borderBottomWidth: 0 },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: "600" },
  rowSubtitle: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  segment: {
    flexDirection: "row",
    borderRadius: radius.md,
    padding: 4,
    gap: 4
  },
  segmentItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "transparent"
  },
  segmentLabel: { fontSize: 14, fontWeight: "700" },
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 5
  },
  badgeText: { fontSize: 12, fontWeight: "700" },
  emptyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg
  },
  emptyText: { flex: 1, fontSize: 13, lineHeight: 18 },
  footnote: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs
  },
  version: {
    fontSize: 12,
    textAlign: "center",
    marginTop: spacing.xl
  }
});
