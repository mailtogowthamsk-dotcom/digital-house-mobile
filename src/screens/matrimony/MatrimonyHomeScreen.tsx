import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getMatrimonyHub, type MatrimonyHub, type MatrimonyHubStatus, type MatrimonyPlanCode, pauseMatrimonyProfile, resumeMatrimonyProfile, closeMatrimonyProfile, reactivateMatrimonyProfile } from "../../api/matrimony.api";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { MatrimonyScreenHeader } from "../../components/matrimony/MatrimonyScreenHeader";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { AvatarImage } from "../../components/ui/AvatarImage";
import { Shimmer } from "../../components/ui/Shimmer";
import { appAlert } from "../../utils/appAlert";

type MenuRow = {
  key: string;
  label: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  primary?: boolean;
  badge?: string;
  badgeTone?: "neutral" | "premium";
  locked?: boolean;
};

const ROW_TINTS: Record<string, { fg: string; bg: string }> = {
  browse: { fg: "#2563EB", bg: "#EFF6FF" },
  interests: { fg: "#E11D48", bg: "#FFF1F2" },
  matches: { fg: "#0D9488", bg: "#F0FDFA" },
  saved: { fg: "#7C3AED", bg: "#F5F3FF" },
  "my-subscription": { fg: "#D97706", bg: "#FFFBEB" },
  plans: { fg: "#0369A1", bg: "#F0F9FF" },
  views: { fg: "#DB2777", bg: "#FDF2F8" },
  update: { fg: "#2563EB", bg: "#EFF6FF" },
  pause: { fg: "#D97706", bg: "#FFFBEB" },
  resume: { fg: "#16A34A", bg: "#DCFCE7" },
  close: { fg: "#DC2626", bg: "#FEE2E2" },
  reactivate: { fg: "#0D9488", bg: "#F0FDFA" }
};

const FALLBACK_TINT = { fg: "#475569", bg: "#F1F5F9" };

function hubStatusChip(status: MatrimonyHubStatus): { label: string; bg: string; fg: string } {
  switch (status) {
    case "APPROVED":
      return { label: "Active", bg: "#DCFCE7", fg: "#16A34A" };
    case "PAUSED":
      return { label: "Paused", bg: "#FEF3C7", fg: "#D97706" };
    case "CLOSED":
      return { label: "Closed", bg: "#E2E8F0", fg: "#475569" };
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
    case "PAUSED":
      return "Profile paused. Hidden from browse and new interests. Existing matches and chats stay open.";
    case "CLOSED":
      return "Profile closed. Hidden from discovery. Matches, chats, and subscription history are preserved.";
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
        label: "Edit profile",
        subtitle: "Photos, details and preferences",
        icon: "create-outline",
        onPress: goSetup
      }
    ];

    if (hub.can_pause) {
      profileSection.push({
        key: "pause",
        label: "Pause profile",
        subtitle: "Hide from browse, keep matches",
        icon: "pause-circle-outline",
        onPress: () => {
          appAlert(
            "Pause matrimony profile?",
            "You will be hidden from Browse, Search, and Recommendations, and will not receive new interests. Existing matches and chats stay available. You can resume anytime.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Pause",
                onPress: () => {
                  void (async () => {
                    try {
                      const next = await pauseMatrimonyProfile();
                      setHub(next);
                    } catch (e) {
                      appAlert("Could not pause", e instanceof Error ? e.message : "Try again");
                    }
                  })();
                }
              }
            ]
          );
        }
      });
    }
    if (hub.can_resume) {
      profileSection.push({
        key: "resume",
        label: "Resume profile",
        subtitle: "Become visible in browse again",
        icon: "play-circle-outline",
        onPress: () => {
          void (async () => {
            try {
              const next = await resumeMatrimonyProfile();
              setHub(next);
            } catch (e) {
              appAlert("Could not resume", e instanceof Error ? e.message : "Try again");
            }
          })();
        }
      });
    }
    if (hub.can_close) {
      profileSection.push({
        key: "close",
        label: "Close profile",
        subtitle: "Hide everywhere, keep your history",
        icon: "close-circle-outline",
        onPress: () => {
          appAlert(
            "Close matrimony profile?",
            "Your profile will be hidden from Browse, Discovery, Search, and Recommendations. New interests will stop. Existing matches, chats, subscriptions, and admin history are preserved. You can reactivate later.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Close profile",
                style: "destructive",
                onPress: () => {
                  void (async () => {
                    try {
                      const next = await closeMatrimonyProfile();
                      setHub(next);
                    } catch (e) {
                      appAlert("Could not close", e instanceof Error ? e.message : "Try again");
                    }
                  })();
                }
              }
            ]
          );
        }
      });
    }
    if (hub.can_reactivate) {
      profileSection.push({
        key: "reactivate",
        label: "Reactivate profile",
        subtitle: "Reopen your closed profile",
        icon: "refresh-circle-outline",
        onPress: () => {
          void (async () => {
            try {
              const next = await reactivateMatrimonyProfile();
              setHub(next);
            } catch (e) {
              appAlert("Could not reactivate", e instanceof Error ? e.message : "Try again");
            }
          })();
        }
      });
    }

    const relationshipAccess =
      hub.status === "APPROVED" || hub.status === "PAUSED" || hub.status === "CLOSED";

    if (!hub.can_browse && !relationshipAccess) {
      return [{ title: "Profile", rows: profileSection }];
    }

    const exploreRows: MenuRow[] = [];
    if (hub.can_browse) {
      exploreRows.push({
        key: "browse",
        label: "Browse profiles",
        subtitle: "Verified, admin-approved candidates",
        icon: "search-outline",
        onPress: () => navigation.navigate("MatrimonyBrowse"),
        primary: true
      });
    }
    if (relationshipAccess) {
      exploreRows.push(
        {
          key: "interests",
          label: "Interests & matches",
          subtitle: "Interests you sent and received",
          icon: "heart-outline",
          onPress: () => navigation.navigate("MatrimonyInterests")
        },
        {
          key: "matches",
          label: "Matches",
          subtitle: "Mutual connections you can chat with",
          icon: "people-outline",
          onPress: () => navigation.navigate("MatrimonyMatches")
        }
      );
    }
    if (hub.can_browse) {
      exploreRows.push(
        {
          key: "saved",
          label: "Saved profiles",
          subtitle: "Your shortlist",
          icon: "bookmark-outline",
          onPress: () => navigation.navigate("MatrimonySaved")
        },
        {
          key: "my-subscription",
          label: "My subscription",
          subtitle: "Current plan and usage",
          icon: "receipt-outline",
          onPress: () => navigation.navigate("MatrimonyMySubscription"),
          badge: hasPaidPlan ? hub.subscription?.planLabel : undefined,
          badgeTone: hasPaidPlan ? "premium" : "neutral"
        },
        {
          key: "plans",
          label: "Subscription plans",
          subtitle: "Compare Gold and Platinum",
          icon: "card-outline",
          onPress: () => navigation.navigate("MatrimonyPlans")
        },
        {
          key: "views",
          label: "Who viewed me",
          subtitle: isPlatinum
            ? "Members who opened your profile"
            : "Upgrade to Platinum to unlock",
          icon: "eye-outline",
          onPress: () =>
            isPlatinum ? navigation.navigate("MatrimonyViews") : navigation.navigate("MatrimonyPlans"),
          locked: !isPlatinum,
          badge: !isPlatinum ? "Platinum" : undefined,
          badgeTone: "premium"
        }
      );
    }

    return [
      ...(exploreRows.length ? [{ title: "Explore", rows: exploreRows }] : []),
      { title: "Profile", rows: profileSection }
    ];
  }, [hub, navigation, hasPaidPlan, isPlatinum]);

  const s = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxl + insets.bottom },
        intro: {
          fontSize: 13,
          lineHeight: 20,
          color: colors.textSecondary,
          marginBottom: spacing.lg
        },
        statusCard: {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
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
        statusTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
        statusIdentity: { flex: 1, minWidth: 0 },
        chip: {
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: radius.full
        },
        chipText: { fontSize: 12, fontWeight: "700" },
        statusTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
        statusMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
        statusBody: { fontSize: 13, lineHeight: 19, color: colors.textSecondary, marginTop: spacing.md },
        progressRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: spacing.lg
        },
        progressLabel: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
        pct: { fontSize: 13, fontWeight: "800", color: colors.primary },
        progressBg: {
          height: 8,
          borderRadius: 4,
          backgroundColor: mode === "dark" ? colors.surfaceElevated : "#E2E8F0",
          marginTop: spacing.sm,
          overflow: "hidden"
        },
        progressFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 4 },
        planBox: {
          backgroundColor: mode === "dark" ? colors.surfaceElevated : "#EFF6FF",
          borderColor: mode === "dark" ? colors.border : "#BFDBFE",
          borderWidth: 1,
          borderRadius: radius.lg,
          padding: spacing.lg,
          marginBottom: spacing.lg
        },
        planTopRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
        planTitle: {
          flex: 1,
          fontWeight: "800",
          fontSize: 14,
          color: mode === "dark" ? colors.text : "#1D4ED8"
        },
        planSub: {
          fontSize: 12,
          marginTop: 6,
          color: mode === "dark" ? colors.textSecondary : "#1D4ED8"
        },
        quotaBg: {
          height: 6,
          borderRadius: 3,
          marginTop: spacing.md,
          overflow: "hidden",
          backgroundColor: mode === "dark" ? colors.border : "#BFDBFE"
        },
        quotaFill: {
          height: "100%",
          borderRadius: 3,
          backgroundColor: mode === "dark" ? colors.primary : "#1D4ED8"
        },
        upsell: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          backgroundColor: mode === "dark" ? `${"#D97706"}1F` : "#FFFBEB",
          borderColor: mode === "dark" ? colors.border : "#FDE68A",
          borderWidth: 1,
          borderRadius: radius.lg,
          padding: spacing.lg,
          marginBottom: spacing.lg
        },
        upsellPressed: { opacity: 0.85 },
        upsellTitle: { fontSize: 14, fontWeight: "800", color: colors.text },
        upsellSub: { fontSize: 12, lineHeight: 17, color: colors.textSecondary, marginTop: 2 },
        section: { marginBottom: spacing.xxl },
        sectionTitle: {
          fontSize: 12,
          fontWeight: "700",
          color: colors.textMuted,
          textTransform: "uppercase",
          letterSpacing: 0.8,
          marginBottom: spacing.md,
          paddingHorizontal: spacing.xs
        },
        sectionList: {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
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
          minHeight: 64,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
          gap: spacing.md,
          borderBottomWidth: StyleSheet.hairlineWidth,
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
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center"
        },
        iconBoxPrimary: { backgroundColor: colors.primary },
        rowBody: { flex: 1, minWidth: 0 },
        rowLabel: { fontSize: 15, fontWeight: "600", color: colors.text },
        rowLabelPrimary: { fontWeight: "800", color: colors.primary },
        rowSub: { fontSize: 12, lineHeight: 16, color: colors.textSecondary, marginTop: 2 },
        rowRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
        badgePill: {
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: radius.full,
          backgroundColor: colors.surfaceElevated
        },
        badgePillPremium: {
          backgroundColor: mode === "dark" ? "rgba(217, 119, 6, 0.18)" : "#FEF3C7"
        },
        badgeText: { fontSize: 11, fontWeight: "700", color: colors.textSecondary },
        badgeTextPremium: { color: "#B45309" },
        centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.lg },
        errorTitle: {
          fontSize: 15,
          fontWeight: "700",
          color: colors.text,
          marginTop: spacing.md,
          textAlign: "center"
        },
        errorBody: {
          fontSize: 13,
          lineHeight: 19,
          color: colors.textSecondary,
          textAlign: "center",
          marginTop: 6,
          marginBottom: spacing.lg
        },
        retryBtn: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.md,
          borderRadius: radius.md,
          backgroundColor: colors.primary
        },
        retryText: { fontSize: 14, fontWeight: "700", color: colors.white },
        setupWrap: { marginTop: spacing.xs, marginBottom: spacing.xl }
      }),
    [colors, mode, insets.bottom]
  );

  if (loading && !hub) {
    return (
      <View style={s.container}>
        <MatrimonyScreenHeader
          title="Matrimony"
          subtitle="Vettuva Gounder community"
          onBack={() => navigation.goBack()}
        />
        <View style={s.scrollContent}>
          <View style={s.statusCard}>
            <View style={s.statusTop}>
              <Shimmer width={56} height={56} borderRadius={28} />
              <View style={s.statusIdentity}>
                <Shimmer width="60%" height={16} />
                <Shimmer width="40%" height={11} style={{ marginTop: 8 }} />
              </View>
            </View>
            <Shimmer width="100%" height={12} style={{ marginTop: spacing.lg }} />
            <Shimmer width="100%" height={8} borderRadius={4} style={{ marginTop: spacing.lg }} />
          </View>
          <View style={s.sectionList}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[s.row, i === 3 && s.rowLast]}>
                <Shimmer width={40} height={40} borderRadius={12} />
                <View style={s.rowBody}>
                  <Shimmer width="50%" height={13} />
                  <Shimmer width="75%" height={10} style={{ marginTop: 6 }} />
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  if (error && !hub) {
    return (
      <View style={s.container}>
        <MatrimonyScreenHeader
          title="Matrimony"
          subtitle="Vettuva Gounder community"
          onBack={() => navigation.goBack()}
        />
        <View style={s.centered}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
          <Text style={s.errorTitle}>Couldn't load matrimony</Text>
          <Text style={s.errorBody}>{error}</Text>
          <Pressable
            onPress={() => void load(false)}
            style={({ pressed }) => [s.retryBtn, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel="Retry"
          >
            <Ionicons name="refresh" size={18} color={colors.white} />
            <Text style={s.retryText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!hub) return null;

  const chip = hubStatusChip(hub.status);
  const chipBg = mode === "dark" ? `${chip.fg}26` : chip.bg;
  const completion = Math.max(0, Math.min(100, hub.completion_percentage));
  const heroPhoto =
    hub.matrimony_candidate_photo ?? hub.account_profile_photo ?? hub.user_context.profile_image;
  const heroName =
    hub.matrimony_candidate_name?.trim() ||
    hub.draft?.candidateName?.trim() ||
    hub.approved?.candidateName?.trim() ||
    hub.user_context.full_name;
  const heroMeta = [hub.user_context.kulam, hub.user_context.city ?? hub.user_context.district]
    .filter(Boolean)
    .join(" · ");
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
    <View style={s.container}>
      <MatrimonyScreenHeader
        title="Matrimony"
        subtitle="Vettuva Gounder community"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />
        }
      >
        <Text style={s.intro}>
          Verified profiles with admin approval. Same-kulam matches are excluded.
        </Text>

        <View style={s.statusCard}>
          <View style={s.statusTop}>
            <AvatarImage uri={heroPhoto} name={heroName} size={56} />
            <View style={s.statusIdentity}>
              <Text style={s.statusTitle} numberOfLines={1}>
                {heroName}
              </Text>
              {heroMeta ? (
                <Text style={s.statusMeta} numberOfLines={1}>
                  {heroMeta}
                </Text>
              ) : null}
            </View>
            <View style={[s.chip, { backgroundColor: chipBg }]}>
              <Text style={[s.chipText, { color: chip.fg }]}>{chip.label}</Text>
            </View>
          </View>
          <Text style={s.statusBody}>
            {hubStatusDescription(hub.status, hub.can_browse, hub.completion_percentage)}
          </Text>
          <View style={s.progressRow}>
            <Text style={s.progressLabel}>Profile completion</Text>
            <Text style={[s.pct, completion >= 100 && { color: colors.success }]}>
              {completion}%
            </Text>
          </View>
          <View style={s.progressBg}>
            <View
              style={[
                s.progressFill,
                { width: `${completion}%` },
                completion >= 100 && { backgroundColor: colors.success }
              ]}
            />
          </View>
        </View>

        {hub.subscription && hasPaidPlan && hub.subscription.quota.limit > 0 ? (
          <View style={s.planBox}>
            <View style={s.planTopRow}>
              <Ionicons
                name="diamond-outline"
                size={16}
                color={mode === "dark" ? colors.text : "#1D4ED8"}
              />
              <Text style={s.planTitle}>
                {hub.subscription.planLabel} plan · {hub.subscription.quota.used}/
                {hub.subscription.quota.limit} opens used
              </Text>
            </View>
            <View style={s.quotaBg}>
              <View
                style={[
                  s.quotaFill,
                  {
                    width: `${Math.min(
                      100,
                      Math.round(
                        (hub.subscription.quota.used / hub.subscription.quota.limit) * 100
                      )
                    )}%`
                  }
                ]}
              />
            </View>
            <Text style={s.planSub}>
              Resets {new Date(hub.subscription.quota.resetsAt).toLocaleDateString()}
            </Text>
          </View>
        ) : hub.can_browse ? (
          <Pressable
            style={({ pressed }) => [s.upsell, pressed && s.upsellPressed]}
            onPress={() => navigation.navigate("MatrimonyPlans")}
            accessibilityRole="button"
            accessibilityLabel="View subscription plans"
          >
            <Ionicons name="sparkles-outline" size={20} color="#D97706" />
            <View style={{ flex: 1 }}>
              <Text style={s.upsellTitle}>You're on the Free plan</Text>
              <Text style={s.upsellSub}>
                Upgrade to Gold or Platinum to open more profiles and see who viewed you.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
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
                const tint = ROW_TINTS[item.key] ?? FALLBACK_TINT;
                const isPremiumBadge = item.badgeTone === "premium";
                return (
                  <Pressable
                    key={item.key}
                    onPress={item.onPress}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                    style={({ pressed }) => [
                      s.row,
                      isPrimary && s.rowPrimary,
                      isLast && s.rowLast,
                      pressed && (isPrimary ? s.rowPrimaryPressed : s.rowPressed)
                    ]}
                  >
                    <View
                      style={[
                        s.iconBox,
                        { backgroundColor: mode === "dark" ? `${tint.fg}26` : tint.bg },
                        isPrimary && s.iconBoxPrimary
                      ]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={20}
                        color={isPrimary ? colors.white : tint.fg}
                      />
                    </View>
                    <View style={s.rowBody}>
                      <Text style={[s.rowLabel, isPrimary && s.rowLabelPrimary]}>{item.label}</Text>
                      {item.subtitle ? (
                        <Text style={s.rowSub} numberOfLines={1}>
                          {item.subtitle}
                        </Text>
                      ) : null}
                    </View>
                    <View style={s.rowRight}>
                      {item.badge ? (
                        <View style={[s.badgePill, isPremiumBadge && s.badgePillPremium]}>
                          <Text style={[s.badgeText, isPremiumBadge && s.badgeTextPremium]}>
                            {item.badge}
                          </Text>
                        </View>
                      ) : null}
                      {item.locked ? (
                        <Ionicons name="lock-closed" size={16} color={colors.textMuted} />
                      ) : (
                        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                      )}
                    </View>
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
