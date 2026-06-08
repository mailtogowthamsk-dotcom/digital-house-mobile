import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  Platform
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getMatrimonyHub, type MatrimonyHub, type MatrimonyHubStatus, type MatrimonyPlanCode } from "../../api/matrimony.api";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { MatrimonyScreenHeader } from "../../components/matrimony/MatrimonyScreenHeader";
import { PrimaryButton } from "../../components/ui/PrimaryButton";

type MenuRow = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  primary?: boolean;
  badge?: string;
  locked?: boolean;
};

function hubStatusChip(status: MatrimonyHubStatus): { label: string; bg: string; fg: string } {
  switch (status) {
    case "APPROVED":
      return { label: "Live", bg: "#DCFCE7", fg: "#16A34A" };
    case "PENDING":
    case "RESUBMITTED":
      return { label: "Under review", bg: "#FEF3C7", fg: "#D97706" };
    case "CHANGES_REQUESTED":
      return { label: "Action needed", bg: "#FFEDD5", fg: "#C2410C" };
    case "REJECTED":
      return { label: "Needs correction", bg: "#FEE2E2", fg: "#DC2626" };
    case "DRAFT":
      return { label: "Draft", bg: "#E0E7FF", fg: "#4338CA" };
    default:
      return { label: "Not started", bg: "#F1F5F9", fg: "#64748B" };
  }
}

function hubStatusDescription(
  status: MatrimonyHubStatus,
  canBrowse: boolean,
  completionPct: number
): string {
  switch (status) {
    case "APPROVED":
      if (!canBrowse && completionPct < 100) {
        return "Finish all required fields (100%) before browsing profiles again.";
      }
      if (!canBrowse) {
        return "Your profile is approved but browsing is paused until requirements are met.";
      }
      return "Your profile is live. Browse verified candidates and connect after mutual match.";
    case "PENDING":
      return "Profile under admin review. You will be notified when approved.";
    case "CHANGES_REQUESTED":
      return "Admin requested changes. Update and resubmit your profile.";
    case "RESUBMITTED":
      return "Corrected profile resubmitted. Review is in progress.";
    case "REJECTED":
      return "Submission needs correction before resubmitting.";
    default:
      return "Complete your matrimony profile to submit for approval.";
  }
}

export function MatrimonyHomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, mode } = useTheme();
  const [hub, setHub] = useState<MatrimonyHub | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedOnce = useRef(false);

  const load = useCallback(async (silent = false) => {
    if (!silent && !loadedOnce.current) setLoading(true);
    if (silent) setRefreshing(true);
    if (!silent) setError(null);
    try {
      const data = await getMatrimonyHub();
      setHub(data);
      loadedOnce.current = true;
    } catch (e) {
      if (!loadedOnce.current) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(loadedOnce.current);
    }, [load])
  );

  const plan: MatrimonyPlanCode = hub?.subscription?.plan ?? "FREE";
  const isPlatinum = plan === "PLATINUM";
  const hasPaidPlan = plan === "GOLD" || plan === "PLATINUM";

  const menuSections = useMemo((): { title: string; rows: MenuRow[] }[] => {
    if (!hub) return [];
    const goSetup = () => navigation.navigate("MatrimonySetup");

    const profileSection: MenuRow[] = [
      {
        key: "update",
        label: "Update matrimony details",
        icon: "create-outline",
        onPress: goSetup
      }
    ];

    if (!hub.can_browse) {
      return [{ title: "Profile", rows: profileSection }];
    }

    const exploreRows: MenuRow[] = [
      {
        key: "browse",
        label: "Browse profiles",
        icon: "search-outline",
        onPress: () => navigation.navigate("MatrimonyBrowse"),
        primary: true
      },
      {
        key: "interests",
        label: "Interests & matches",
        icon: "heart-outline",
        onPress: () => navigation.navigate("MatrimonyInterests")
      },
      {
        key: "saved",
        label: "Saved profiles",
        icon: "bookmark-outline",
        onPress: () => navigation.navigate("MatrimonySaved")
      },
      {
        key: "my-subscription",
        label: "My subscription",
        icon: "card-outline",
        onPress: () => navigation.navigate("MatrimonyMySubscription"),
        badge: hasPaidPlan ? hub.subscription?.planLabel : undefined
      },
      {
        key: "plans",
        label: "Subscription plans",
        icon: "card-outline",
        onPress: () => navigation.navigate("MatrimonyPlans")
      },
      {
        key: "views",
        label: "Who viewed me",
        icon: "eye-outline",
        onPress: () =>
          isPlatinum ? navigation.navigate("MatrimonyViews") : navigation.navigate("MatrimonyPlans"),
        locked: !isPlatinum,
        badge: !isPlatinum ? "Platinum" : undefined
      }
    ];

    return [
      { title: "Explore", rows: exploreRows },
      { title: "Profile", rows: profileSection }
    ];
  }, [hub, navigation, hasPaidPlan, isPlatinum]);

  const s = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxl },
        intro: {
          fontSize: 13,
          lineHeight: 20,
          color: colors.textSecondary,
          marginBottom: spacing.lg
        },
        statusCard: {
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.lg,
          marginBottom: spacing.lg,
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4
            },
            android: { elevation: 1 },
            default: {}
          })
        },
        statusTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
        chip: {
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: radius.full
        },
        chipText: { fontSize: 12, fontWeight: "700" },
        pct: { fontSize: 14, fontWeight: "700", color: colors.primary },
        statusTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginTop: spacing.sm },
        statusBody: { fontSize: 13, lineHeight: 19, color: colors.textSecondary, marginTop: 6 },
        progressBg: {
          height: 6,
          borderRadius: 3,
          backgroundColor: colors.border,
          marginTop: spacing.md,
          overflow: "hidden"
        },
        progressFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 3 },
        planBox: {
          backgroundColor: mode === "dark" ? colors.surfaceElevated : "#EFF6FF",
          borderColor: mode === "dark" ? colors.border : "#BFDBFE",
          borderWidth: 1,
          borderRadius: radius.md,
          padding: spacing.md,
          marginBottom: spacing.lg
        },
        planTitle: {
          fontWeight: "700",
          fontSize: 13,
          color: mode === "dark" ? colors.text : "#1D4ED8"
        },
        planSub: {
          fontSize: 12,
          marginTop: 4,
          color: mode === "dark" ? colors.textSecondary : "#1D4ED8"
        },
        section: { marginBottom: spacing.xxl },
        sectionTitle: {
          fontSize: 13,
          fontWeight: "600",
          color: colors.textSecondary,
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: spacing.md,
          paddingHorizontal: spacing.xs
        },
        sectionList: {
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors.border,
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4
            },
            android: { elevation: 1 },
            default: {}
          })
        },
        row: {
          flexDirection: "row",
          alignItems: "center",
          minHeight: 56,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          gap: spacing.lg,
          borderBottomWidth: 1,
          borderBottomColor: colors.border
        },
        rowPressed: { backgroundColor: colors.surfaceElevated },
        rowPrimary: {
          backgroundColor: mode === "dark" ? colors.surfaceElevated + "80" : "#EFF6FF",
          borderBottomColor: mode === "dark" ? colors.border : "rgba(37,99,235,0.12)"
        },
        rowPrimaryPressed: {
          backgroundColor: mode === "dark" ? colors.surfaceElevated : "#DBEAFE"
        },
        rowLast: { borderBottomWidth: 0 },
        iconBox: {
          width: 40,
          height: 40,
          borderRadius: radius.sm,
          backgroundColor: colors.surfaceElevated,
          alignItems: "center",
          justifyContent: "center"
        },
        iconBoxPrimary: { backgroundColor: colors.primary },
        rowLabel: { flex: 1, fontSize: 16, fontWeight: "500", color: colors.text },
        rowLabelPrimary: { fontWeight: "600", color: colors.primary },
        rowMeta: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
        badgePill: {
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: radius.full,
          backgroundColor: colors.surfaceElevated
        },
        badgeText: { fontSize: 11, fontWeight: "700", color: colors.textSecondary },
        centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.lg },
        setupWrap: { marginTop: spacing.md }
      }),
    [colors, mode]
  );

  if (loading && !hub) {
    return (
      <View style={[s.centered, s.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error && !hub) {
    return (
      <View style={[s.centered, s.container, { paddingTop: insets.top }]}>
        <Text style={{ color: colors.error, textAlign: "center", marginBottom: spacing.md }}>{error}</Text>
        <Pressable onPress={() => void load(false)}>
          <Text style={{ color: colors.primary, fontWeight: "700" }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!hub) return null;

  const chip = hubStatusChip(hub.status);
  const needsSetup =
    hub.status === "CHANGES_REQUESTED" ||
    hub.status === "REJECTED" ||
    hub.status === "NOT_STARTED" ||
    hub.status === "DRAFT" ||
    (hub.status === "APPROVED" && !hub.can_browse);

  const setupLabel =
    hub.status === "CHANGES_REQUESTED"
      ? "Continue application"
      : hub.status === "APPROVED" && !hub.can_browse
        ? "Finish profile updates"
        : hub.completion_percentage >= 100
          ? "Submit for approval"
          : "Complete matrimony profile";

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <MatrimonyScreenHeader title="Matrimony" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />
        }
      >
        <Text style={s.intro}>
          Vettuva Gounder community matrimony — verified profiles, admin approval, same-kulam excluded.
        </Text>

        <View style={s.statusCard}>
          <View style={s.statusTop}>
            <View style={[s.chip, { backgroundColor: chip.bg }]}>
              <Text style={[s.chipText, { color: chip.fg }]}>{chip.label}</Text>
            </View>
            <Text style={s.pct}>{hub.completion_percentage}% complete</Text>
          </View>
          <Text style={s.statusTitle}>
            {hub.status === "APPROVED"
              ? hub.can_browse
                ? "Approved & live"
                : "Approved — complete profile"
              : chip.label}
          </Text>
          <Text style={s.statusBody}>
            {hubStatusDescription(hub.status, hub.can_browse, hub.completion_percentage)}
          </Text>
          <View style={s.progressBg}>
            <View style={[s.progressFill, { width: `${hub.completion_percentage}%` }]} />
          </View>
        </View>

        {hub.subscription && hasPaidPlan && hub.subscription.quota.limit > 0 ? (
          <View style={s.planBox}>
            <Text style={s.planTitle}>
              {hub.subscription.planLabel} plan · Opens {hub.subscription.quota.used}/
              {hub.subscription.quota.limit} this month
            </Text>
            <Text style={s.planSub}>
              Resets {new Date(hub.subscription.quota.resetsAt).toLocaleDateString()}
            </Text>
          </View>
        ) : null}

        {needsSetup ? (
          <View style={s.setupWrap}>
            <PrimaryButton title={setupLabel} onPress={() => navigation.navigate("MatrimonySetup")} />
          </View>
        ) : null}

        {menuSections.map((section) => (
          <View key={section.title} style={s.section}>
            <Text style={s.sectionTitle}>{section.title}</Text>
            <View style={s.sectionList}>
              {section.rows.map((item, idx) => {
                const isLast = idx === section.rows.length - 1;
                const isPrimary = !!item.primary;
                return (
                  <Pressable
                    key={item.key}
                    onPress={item.onPress}
                    style={({ pressed }) => [
                      s.row,
                      isPrimary && s.rowPrimary,
                      isLast && s.rowLast,
                      pressed && (isPrimary ? s.rowPrimaryPressed : s.rowPressed)
                    ]}
                  >
                    <View style={[s.iconBox, isPrimary && s.iconBoxPrimary]}>
                      <Ionicons
                        name={item.icon}
                        size={22}
                        color={isPrimary ? colors.white : colors.text}
                      />
                    </View>
                    <Text style={[s.rowLabel, isPrimary && s.rowLabelPrimary]}>{item.label}</Text>
                    {item.badge ? (
                      <View style={s.badgePill}>
                        <Text style={s.badgeText}>{item.badge}</Text>
                      </View>
                    ) : item.locked ? (
                      <Ionicons name="lock-closed" size={18} color={colors.textMuted} />
                    ) : (
                      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
