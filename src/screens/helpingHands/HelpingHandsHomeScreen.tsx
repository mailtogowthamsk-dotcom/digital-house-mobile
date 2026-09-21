import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Image,
  Linking
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getFeed, type FeedItem } from "../../api/home.api";
import {
  getHelpingHandsStats,
  getCommunityHeroes,
  getMyHelpRequestsPage,
  getMyHelpContributionsPage,
  offerHelp,
  type HelpingHandsStats,
  type CommunityHero,
  type MyHelpRequest,
  type MyHelpContribution
} from "../../api/helpingHands.api";
import { getErrorStatus } from "../../api/client";
import { deletePost } from "../../api/posts.api";
import { mergeById } from "../../utils/mergeById";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { timeAgo } from "../../utils/timeAgo";
import { appAlert } from "../../utils/appAlert";
import { HeaderBackButton } from "../../components/ui/HeaderBackButton";
import { useAuth } from "../../context/AuthContext";
import {
  HELP_CATEGORIES,
  formatHelpCategory,
  formatHelpStatus,
  formatHelpUrgency,
  urgencyBadgeColor
} from "../../constants/helpingHands";

type Tab = "home" | "heroes" | "activity";

const PAGE_SIZE = 10;
const ACCENT = "#7C3AED";

export function HelpingHandsHomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, mode: themeMode } = useTheme();
  const { user } = useAuth();
  const myUserId = user?.id ?? null;
  const [tab, setTab] = useState<Tab>("home");
  const [category, setCategory] = useState<string | null>(null);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [stats, setStats] = useState<HelpingHandsStats | null>(null);
  const [heroes, setHeroes] = useState<CommunityHero[]>([]);
  const [requests, setRequests] = useState<MyHelpRequest[]>([]);
  const [contributions, setContributions] = useState<MyHelpContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = React.useRef(false);
  const [nextCursor, setNextCursor] = useState<number | string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offeringId, setOfferingId] = useState<number | null>(null);
  const nextCursorRef = React.useRef<number | string | null>(null);
  const heroesNextOffsetRef = React.useRef<number | null>(null);
  const requestsNextOffsetRef = React.useRef<number | null>(null);
  const contributionsNextOffsetRef = React.useRef<number | null>(null);
  const [heroesNextOffset, setHeroesNextOffset] = useState<number | null>(null);
  const [requestsNextOffset, setRequestsNextOffset] = useState<number | null>(null);
  const [contributionsNextOffset, setContributionsNextOffset] = useState<number | null>(null);
  const hasLoadedOnce = React.useRef(false);
  nextCursorRef.current = nextCursor;
  heroesNextOffsetRef.current = heroesNextOffset;
  requestsNextOffsetRef.current = requestsNextOffset;
  contributionsNextOffsetRef.current = contributionsNextOffset;

  const loadHome = useCallback(async (mode: "replace" | "append", cat: string | null) => {
    const cursor = mode === "append" ? nextCursorRef.current ?? undefined : undefined;
    const [feed, statsData] = await Promise.all([
      getFeed({
        limit: PAGE_SIZE,
        sort: "recent",
        postType: "HELP_REQUEST",
        ...(cat ? { helpCategory: cat } : {}),
        ...(cursor != null ? { cursor } : { page: 1 })
      }),
      mode === "replace" ? getHelpingHandsStats() : Promise.resolve(null)
    ]);
    setItems((prev) => (mode === "append" ? mergeById(prev, feed.items) : feed.items));
    setNextCursor(feed.nextCursor ?? null);
    if (statsData) setStats(statsData);
  }, []);

  const loadHeroes = useCallback(async (mode: "replace" | "append") => {
    const offset = mode === "append" ? heroesNextOffsetRef.current ?? 0 : 0;
    if (mode === "append" && heroesNextOffsetRef.current == null) return;
    const data = await getCommunityHeroes({ limit: PAGE_SIZE, offset });
    setHeroes((prev) => {
      if (mode !== "append") return data.items;
      const seen = new Set(prev.map((h) => h.userId));
      return [...prev, ...data.items.filter((h) => !seen.has(h.userId))];
    });
    setHeroesNextOffset(data.nextOffset);
  }, []);

  const loadActivity = useCallback(async (mode: "replace" | "append") => {
    if (mode === "replace") {
      const [reqPage, contribPage] = await Promise.all([
        getMyHelpRequestsPage({ limit: PAGE_SIZE, offset: 0 }),
        getMyHelpContributionsPage({ limit: PAGE_SIZE, offset: 0 })
      ]);
      setRequests(reqPage.items);
      setContributions(contribPage.items);
      setRequestsNextOffset(reqPage.nextOffset);
      setContributionsNextOffset(contribPage.nextOffset);
      return;
    }

    // Append: finish requests first, then contributions.
    if (requestsNextOffsetRef.current != null) {
      const reqPage = await getMyHelpRequestsPage({
        limit: PAGE_SIZE,
        offset: requestsNextOffsetRef.current
      });
      setRequests((prev) => {
        const seen = new Set(prev.map((r) => r.postId));
        return [...prev, ...reqPage.items.filter((r) => !seen.has(r.postId))];
      });
      setRequestsNextOffset(reqPage.nextOffset);
      return;
    }

    if (contributionsNextOffsetRef.current != null) {
      const contribPage = await getMyHelpContributionsPage({
        limit: PAGE_SIZE,
        offset: contributionsNextOffsetRef.current
      });
      setContributions((prev) => {
        const seen = new Set(prev.map((c) => `${c.postId}-${c.date}`));
        return [
          ...prev,
          ...contribPage.items.filter((c) => !seen.has(`${c.postId}-${c.date}`))
        ];
      });
      setContributionsNextOffset(contribPage.nextOffset);
    }
  }, []);

  const loadTab = useCallback(
    async (active: Tab, cat: string | null) => {
      try {
        setError(null);
        if (active === "home") await loadHome("replace", cat);
        else if (active === "heroes") await loadHeroes("replace");
        else await loadActivity("replace");
        hasLoadedOnce.current = true;
      } catch (e) {
        const status = getErrorStatus(e);
        if (status === 401) navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        else if (status === 403)
          navigation.reset({ index: 0, routes: [{ name: "PendingApproval" }] });
        else setError(e instanceof Error ? e.message : "Something went wrong");
      }
    },
    [loadActivity, loadHeroes, loadHome, navigation]
  );

  useFocusEffect(
    useCallback(() => {
      const showSpinner = !hasLoadedOnce.current;
      if (showSpinner) setLoading(true);
      setNextCursor(null);
      setHeroesNextOffset(null);
      setRequestsNextOffset(null);
      setContributionsNextOffset(null);
      void loadTab(tab, category).finally(() => setLoading(false));
    }, [tab, category, loadTab])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setNextCursor(null);
    setHeroesNextOffset(null);
    setRequestsNextOffset(null);
    setContributionsNextOffset(null);
    await loadTab(tab, category);
    setRefreshing(false);
  }, [category, loadTab, tab]);

  const openMyRequestActions = useCallback(
    (r: MyHelpRequest) => {
      const status = String(r.status || "").toUpperCase();
      const canEdit = status === "OPEN" || status === "IN_PROGRESS";
      appAlert(r.title, "Manage this help request", [
        { text: "View", onPress: () => navigation.navigate("PostDetail", { postId: r.postId }) },
        ...(canEdit
          ? [
              {
                text: "Edit",
                onPress: () =>
                  navigation.navigate("CreateHelpRequest", { editPostId: r.postId })
              }
            ]
          : []),
        {
          text: "Delete",
          style: "destructive" as const,
          onPress: () => {
            appAlert(
              "Delete this request?",
              "This permanently removes the request and cannot be undone.",
              [
                { text: "Keep", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await deletePost(r.postId);
                      setRequests((prev) => prev.filter((x) => x.postId !== r.postId));
                      appAlert("Deleted", "Help request removed.");
                    } catch (e) {
                      appAlert(
                        "Error",
                        (e as any)?.response?.data?.message ?? "Could not delete request."
                      );
                    }
                  }
                }
              ]
            );
          }
        },
        { text: "Close", style: "cancel" }
      ]);
    },
    [navigation]
  );

  const onEndReached = useCallback(async () => {
    if (loadingMoreRef.current || loading) return;

    if (tab === "home") {
      if (!nextCursorRef.current) return;
      loadingMoreRef.current = true;
      setLoadingMore(true);
      try {
        await loadHome("append", category);
      } finally {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
      return;
    }

    if (tab === "heroes") {
      if (heroesNextOffsetRef.current == null) return;
      loadingMoreRef.current = true;
      setLoadingMore(true);
      try {
        await loadHeroes("append");
      } finally {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
      return;
    }

    if (tab === "activity") {
      if (
        requestsNextOffsetRef.current == null &&
        contributionsNextOffsetRef.current == null
      ) {
        return;
      }
      loadingMoreRef.current = true;
      setLoadingMore(true);
      try {
        await loadActivity("append");
      } finally {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [category, loadActivity, loadHeroes, loadHome, loading, tab]);

  const handleOffer = useCallback(
    async (postId: number, title: string) => {
      const post = items.find((i) => i.postId === postId);
      if (myUserId != null && post?.author?.userId === myUserId) {
        appAlert("Your request", "You can’t offer help on your own request. Open Manage to edit or resolve it.");
        return;
      }
      appAlert("Ready to help?", `Offer help for “${title}”? You can chat or call next.`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "I'm Ready",
          onPress: async () => {
            try {
              setOfferingId(postId);
              const result = await offerHelp(postId);
              appAlert("Thank you", "How would you like to reach out?", [
                {
                  text: "Chat",
                  onPress: () =>
                    navigation.navigate("Chat", {
                      otherUserId: result.requesterUserId,
                      name: post?.author?.name ?? "Member",
                      profileImage: post?.author?.profileImage ?? null
                    })
                },
                ...(result.contactPhone
                  ? [
                      {
                        text: "Call",
                        onPress: () => {
                          void Linking.openURL(`tel:${result.contactPhone}`);
                        }
                      }
                    ]
                  : []),
                { text: "Done", style: "cancel" }
              ]);
              setItems((prev) =>
                prev.map((i) =>
                  i.postId === postId
                    ? {
                        ...i,
                        helpHelperCount: (i.helpHelperCount ?? 0) + (result.created ? 1 : 0)
                      }
                    : i
                )
              );
            } catch (e) {
              appAlert("Could not offer help", e instanceof Error ? e.message : "Try again");
            } finally {
              setOfferingId(null);
            }
          }
        }
      ]);
    },
    [items, myUserId, navigation]
  );

  const s = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.background },
        header: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.sm,
          backgroundColor: colors.surface,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
          gap: 8
        },
        backBtn: {
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surfaceElevated
        },
        headerTextCol: { flex: 1, minWidth: 0 },
        headerTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
        headerSub: { marginTop: 1, fontSize: 12, color: colors.textSecondary },
        toolbar: {
          backgroundColor: colors.surface,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.sm,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
          gap: spacing.sm
        },
        segment: {
          flexDirection: "row",
          backgroundColor: colors.surfaceElevated,
          borderRadius: radius.md,
          padding: 3,
          gap: 2
        },
        segmentBtn: {
          flex: 1,
          paddingVertical: 9,
          borderRadius: radius.sm,
          alignItems: "center"
        },
        segmentBtnActive: {
          backgroundColor: colors.surface,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 2,
          elevation: 1
        },
        segmentText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
        segmentTextActive: { color: ACCENT, fontWeight: "700" },
        listPad: {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: 110
        },
        banner: {
          backgroundColor: themeMode === "dark" ? "#2E1065" : "#F5F3FF",
          borderRadius: radius.lg,
          padding: spacing.lg,
          marginBottom: spacing.md,
          borderWidth: 1,
          borderColor: themeMode === "dark" ? "#5B21B6" : "#EDE9FE"
        },
        bannerTitle: {
          fontSize: 18,
          fontWeight: "800",
          color: themeMode === "dark" ? "#E9D5FF" : "#4C1D95",
          marginBottom: 4
        },
        bannerSub: {
          fontSize: 13,
          lineHeight: 19,
          color: themeMode === "dark" ? "#C4B5FD" : "#6D28D9"
        },
        statsRow: {
          flexDirection: "row",
          gap: 8,
          marginBottom: spacing.md
        },
        statPill: {
          flex: 1,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          paddingVertical: 10,
          paddingHorizontal: 8,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center"
        },
        statValue: { fontSize: 16, fontWeight: "800", color: colors.text },
        statLabel: {
          marginTop: 2,
          fontSize: 10,
          fontWeight: "600",
          color: colors.textMuted,
          textAlign: "center"
        },
        chipScroll: { paddingBottom: spacing.sm },
        chip: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderRadius: radius.full,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.background,
          marginRight: spacing.sm
        },
        chipActive: {
          borderColor: ACCENT,
          backgroundColor: themeMode === "dark" ? "#4C1D95" : "#F5F3FF"
        },
        chipText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
        chipTextActive: { color: themeMode === "dark" ? "#DDD6FE" : ACCENT },
        card: {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: "hidden",
          marginBottom: spacing.md
        },
        cardPressed: { opacity: 0.94, borderColor: ACCENT + "66" },
        cover: {
          width: "100%",
          height: 140,
          backgroundColor: themeMode === "dark" ? colors.surfaceElevated : "#F5F3FF"
        },
        cardBody: { padding: spacing.md },
        badgeRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 8
        },
        badge: {
          paddingHorizontal: 9,
          paddingVertical: 3,
          borderRadius: radius.full
        },
        badgeText: { fontSize: 11, fontWeight: "700" },
        cardTitle: {
          fontSize: 16,
          fontWeight: "800",
          color: colors.text,
          lineHeight: 22,
          marginBottom: 4
        },
        cardDesc: {
          fontSize: 13,
          color: colors.textSecondary,
          lineHeight: 19,
          marginBottom: 10
        },
        metaRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 12
        },
        metaPill: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          backgroundColor: colors.surfaceElevated,
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: radius.full
        },
        metaText: { fontSize: 11, fontWeight: "600", color: colors.textSecondary },
        actions: { flexDirection: "row", gap: 8, alignItems: "center" },
        secondaryBtn: {
          flex: 1,
          paddingVertical: 12,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center",
          backgroundColor: colors.surfaceElevated
        },
        secondaryBtnText: { fontWeight: "700", color: colors.text, fontSize: 13 },
        helpBtn: {
          flex: 1.2,
          paddingVertical: 12,
          borderRadius: radius.md,
          backgroundColor: ACCENT,
          alignItems: "center",
          justifyContent: "center"
        },
        helpBtnPressed: { opacity: 0.9 },
        helpBtnText: { fontWeight: "800", color: "#fff", fontSize: 13 },
        sectionTitle: {
          fontSize: 14,
          fontWeight: "800",
          color: colors.text,
          marginBottom: spacing.sm,
          letterSpacing: 0.2
        },
        empty: { alignItems: "center", paddingTop: 40, paddingHorizontal: spacing.xl },
        emptyIcon: {
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: themeMode === "dark" ? "#4C1D95" : "#F5F3FF",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: spacing.md
        },
        emptyTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
        emptyText: {
          marginTop: spacing.sm,
          textAlign: "center",
          fontSize: 13,
          lineHeight: 20,
          color: colors.textSecondary
        },
        heroCard: {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.md,
          marginBottom: spacing.md
        },
        heroTop: { flexDirection: "row", gap: 12 },
        avatar: {
          width: 52,
          height: 52,
          borderRadius: 16,
          backgroundColor: themeMode === "dark" ? colors.surfaceElevated : "#F5F3FF"
        },
        heroName: { fontSize: 16, fontWeight: "800", color: colors.text },
        heroIntro: { marginTop: 2, fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
        heroStat: {
          marginTop: 6,
          fontSize: 12,
          fontWeight: "700",
          color: ACCENT
        },
        tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
        tag: {
          paddingHorizontal: 9,
          paddingVertical: 3,
          borderRadius: radius.full,
          backgroundColor: colors.surfaceElevated
        },
        tagText: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
        quote: {
          marginTop: 12,
          padding: spacing.md,
          borderRadius: radius.md,
          backgroundColor: themeMode === "dark" ? colors.surfaceElevated : "#F5F3FF",
          borderLeftWidth: 3,
          borderLeftColor: ACCENT
        },
        quoteText: {
          fontSize: 13,
          fontStyle: "italic",
          color: colors.text,
          lineHeight: 19
        },
        activityCard: {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.md,
          marginBottom: spacing.sm
        },
        activityTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
        activityMeta: { marginTop: 4, fontSize: 12, color: colors.textSecondary },
        footer: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          backgroundColor: colors.surface
        },
        center: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.lg },
        errorText: { color: colors.error, textAlign: "center", marginBottom: spacing.md }
      }),
    [colors, themeMode]
  );

  const renderRequestCard = useCallback(
    ({ item }: { item: FeedItem }) => {
      const urgency = urgencyBadgeColor(item.helpUrgency);
      const desc = (item.description ?? "").trim();
      const isOwnRequest = myUserId != null && item.author?.userId === myUserId;
      return (
        <View style={s.card}>
          {item.mediaUrl ? (
            <Image source={{ uri: item.mediaUrl }} style={s.cover} resizeMode="cover" />
          ) : (
            <View style={[s.cover, { alignItems: "center", justifyContent: "center" }]}>
              <Ionicons name="hand-left-outline" size={36} color={ACCENT} />
            </View>
          )}
          <View style={s.cardBody}>
            <View style={s.badgeRow}>
              <View style={[s.badge, { backgroundColor: urgency.bg }]}>
                <Text style={[s.badgeText, { color: urgency.text }]}>
                  {formatHelpUrgency(item.helpUrgency)}
                </Text>
              </View>
              <View
                style={[
                  s.badge,
                  {
                    backgroundColor: themeMode === "dark" ? colors.surfaceElevated : "#F5F3FF"
                  }
                ]}
              >
                <Text style={[s.badgeText, { color: ACCENT }]}>
                  {formatHelpCategory(item.helpCategory)}
                </Text>
              </View>
              {isOwnRequest ? (
                <View
                  style={[
                    s.badge,
                    {
                      backgroundColor: themeMode === "dark" ? colors.surfaceElevated : "#ECFDF5"
                    }
                  ]}
                >
                  <Text style={[s.badgeText, { color: colors.primary }]}>Your request</Text>
                </View>
              ) : null}
            </View>
            <Text style={s.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>
            {desc ? (
              <Text style={s.cardDesc} numberOfLines={2}>
                {desc}
              </Text>
            ) : null}
            <View style={s.metaRow}>
              {item.helpLocation ? (
                <View style={s.metaPill}>
                  <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
                  <Text style={s.metaText}>{item.helpLocation}</Text>
                </View>
              ) : null}
              <View style={s.metaPill}>
                <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                <Text style={s.metaText}>{timeAgo(item.createdAt)}</Text>
              </View>
              <View style={s.metaPill}>
                <Ionicons name="people-outline" size={12} color={colors.textSecondary} />
                <Text style={s.metaText}>{item.helpHelperCount ?? 0} helping</Text>
              </View>
            </View>
            <View style={s.actions}>
              <Pressable
                style={[s.secondaryBtn, isOwnRequest ? { flex: 1 } : null]}
                onPress={() => navigation.navigate("PostDetail", { postId: item.postId })}
              >
                <Text style={s.secondaryBtnText}>{isOwnRequest ? "Manage" : "Details"}</Text>
              </Pressable>
              {!isOwnRequest ? (
                <Pressable
                  style={({ pressed }) => [s.helpBtn, pressed && s.helpBtnPressed]}
                  disabled={offeringId === item.postId}
                  onPress={() => void handleOffer(item.postId, item.title)}
                >
                  {offeringId === item.postId ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={s.helpBtnText}>I'm Ready</Text>
                  )}
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      );
    },
    [
      colors.primary,
      colors.surfaceElevated,
      colors.textSecondary,
      handleOffer,
      myUserId,
      navigation,
      offeringId,
      s,
      themeMode
    ]
  );

  const homeHeader = (
    <>
      <View style={s.banner}>
        <Text style={s.bannerTitle}>Together, we make a difference</Text>
        <Text style={s.bannerSub}>
          Offer help to members in need — or create a request when you need support.
        </Text>
      </View>
      {stats ? (
        <View style={s.statsRow}>
          {[
            { label: "Helped", value: stats.peopleHelped },
            { label: "Volunteers", value: stats.activeVolunteers },
            { label: "Done", value: stats.requestsCompleted },
            { label: "Touched", value: stats.livesTouched }
          ].map((st) => (
            <View key={st.label} style={s.statPill}>
              <Text style={s.statValue}>{st.value}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipScroll}
      >
        <Pressable
          style={[s.chip, !category && s.chipActive]}
          onPress={() => setCategory(null)}
        >
          <Text style={[s.chipText, !category && s.chipTextActive]}>All</Text>
        </Pressable>
        {HELP_CATEGORIES.map((c) => {
          const active = category === c.value;
          return (
            <Pressable
              key={c.value}
              style={[s.chip, active && s.chipActive]}
              onPress={() => setCategory(c.value)}
            >
              <Ionicons name={c.icon} size={14} color={active ? ACCENT : colors.textMuted} />
              <Text style={[s.chipText, active && s.chipTextActive]}>{c.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </>
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: "home", label: "Requests" },
    { id: "heroes", label: "Heroes" },
    { id: "activity", label: "My activity" }
  ];

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + spacing.xs }]}>
        <HeaderBackButton onPress={() => navigation.goBack()} />
        <View style={s.headerTextCol}>
          <Text style={s.headerTitle}>Helping Hands</Text>
          <Text style={s.headerSub}>Community help & kindness</Text>
        </View>
        <Pressable
          style={s.backBtn}
          onPress={() => navigation.navigate("CreateHelpRequest")}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Create request"
        >
          <Ionicons name="add" size={22} color={ACCENT} />
        </Pressable>
      </View>

      <View style={s.toolbar}>
        <View style={s.segment}>
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <Pressable
                key={t.id}
                style={[s.segmentBtn, active && s.segmentBtnActive]}
                onPress={() => setTab(t.id)}
              >
                <Text style={[s.segmentText, active && s.segmentTextActive]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {loading &&
      !refreshing &&
      ((tab === "home" && items.length === 0) ||
        (tab === "heroes" && heroes.length === 0) ||
        (tab === "activity" && requests.length === 0 && contributions.length === 0)) ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : error && !refreshing && !(tab === "home" && items.length > 0) && !(tab === "heroes" && heroes.length > 0) ? (
        <View style={s.center}>
          <Text style={s.errorText}>{error}</Text>
          <PrimaryButton title="Retry" onPress={() => void onRefresh()} />
        </View>
      ) : tab === "home" ? (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.postId)}
          renderItem={renderRequestCard}
          ListHeaderComponent={homeHeader}
          contentContainerStyle={s.listPad}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              colors={[ACCENT]}
            />
          }
          onEndReached={() => void onEndReached()}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <Ionicons name="hand-left-outline" size={32} color={ACCENT} />
              </View>
              <Text style={s.emptyTitle}>No open requests</Text>
              <Text style={s.emptyText}>
                When someone needs help, it will show up here. You can also create a request.
              </Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color={ACCENT} />
            ) : null
          }
        />
      ) : tab === "heroes" ? (
        <FlatList
          data={heroes}
          keyExtractor={(item) => String(item.userId)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              colors={[ACCENT]}
            />
          }
          contentContainerStyle={s.listPad}
          onEndReached={() => void onEndReached()}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={
            <Text style={s.sectionTitle}>Community heroes — kindness remembered</Text>
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <Ionicons name="trophy-outline" size={32} color={ACCENT} />
              </View>
              <Text style={s.emptyTitle}>No heroes yet</Text>
              <Text style={s.emptyText}>
                Heroes appear here as members help each other and receive appreciation.
              </Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color={ACCENT} />
            ) : null
          }
          renderItem={({ item }: { item: CommunityHero }) => (
            <View style={s.heroCard}>
              <View style={s.heroTop}>
                {item.profileImage ? (
                  <Image source={{ uri: item.profileImage }} style={s.avatar} />
                ) : (
                  <View style={[s.avatar, { alignItems: "center", justifyContent: "center" }]}>
                    <Ionicons name="person" size={22} color={ACCENT} />
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.heroName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={s.heroIntro} numberOfLines={2}>
                    {item.intro ||
                      `Helped ${item.livesHelped} ${item.livesHelped === 1 ? "person" : "people"}`}
                  </Text>
                  <Text style={s.heroStat}>
                    Helped {item.livesHelped} {item.livesHelped === 1 ? "family" : "families"}
                  </Text>
                </View>
              </View>
              {item.categories.length > 0 ? (
                <View style={s.tagRow}>
                  {item.categories.slice(0, 4).map((c) => (
                    <View key={c} style={s.tag}>
                      <Text style={s.tagText}>{c}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {item.recentAppreciation ? (
                <View style={s.quote}>
                  <Text style={s.quoteText}>“{item.recentAppreciation}”</Text>
                </View>
              ) : null}
            </View>
          )}
        />
      ) : (
        <FlatList
          data={[
            { kind: "header" as const, key: "hdr-requests", title: "My requests" },
            ...(requests.length === 0
              ? [{ kind: "empty-requests" as const, key: "empty-requests" }]
              : requests.map((r) => ({ kind: "request" as const, key: `req-${r.postId}`, item: r }))),
            { kind: "header" as const, key: "hdr-contrib", title: "My contributions" },
            ...(contributions.length === 0
              ? [{ kind: "empty-contrib" as const, key: "empty-contrib" }]
              : contributions.map((c) => ({
                  kind: "contrib" as const,
                  key: `contrib-${c.postId}-${c.date}`,
                  item: c
                })))
          ]}
          keyExtractor={(row) => row.key}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              colors={[ACCENT]}
            />
          }
          contentContainerStyle={s.listPad}
          onEndReached={() => void onEndReached()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color={ACCENT} />
            ) : null
          }
          renderItem={({ item: row }) => {
            if (row.kind === "header") {
              return (
                <Text
                  style={[
                    s.sectionTitle,
                    row.key === "hdr-contrib" ? { marginTop: spacing.lg } : null
                  ]}
                >
                  {row.title}
                </Text>
              );
            }
            if (row.kind === "empty-requests") {
              return (
                <View style={[s.empty, { paddingTop: 16 }]}>
                  <Text style={s.emptyText}>You haven’t created a help request yet.</Text>
                </View>
              );
            }
            if (row.kind === "empty-contrib") {
              return (
                <View style={[s.empty, { paddingTop: 16 }]}>
                  <Text style={s.emptyText}>
                    When you help someone, your contribution history will live here.
                  </Text>
                </View>
              );
            }
            if (row.kind === "request") {
              const r = row.item;
              return (
                <Pressable
                  style={({ pressed }) => [s.activityCard, pressed && s.cardPressed]}
                  onPress={() => navigation.navigate("PostDetail", { postId: r.postId })}
                  onLongPress={() => openMyRequestActions(r)}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: 10
                    }}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.activityTitle} numberOfLines={2}>
                        {r.title}
                      </Text>
                      <Text style={s.activityMeta}>
                        {formatHelpCategory(r.category)} · {formatHelpStatus(r.status)} ·{" "}
                        {r.helperCount} helping
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => openMyRequestActions(r)}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel="Manage help request"
                      style={({ pressed }) => ({
                        padding: 4,
                        opacity: pressed ? 0.6 : 1
                      })}
                    >
                      <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
                    </Pressable>
                  </View>
                </Pressable>
              );
            }
            const c = row.item;
            return (
              <View style={s.activityCard}>
                <Text style={s.activityTitle}>{formatHelpCategory(c.category)}</Text>
                <Text style={s.activityMeta}>
                  Helped {c.personHelped} · {new Date(c.date).toLocaleDateString()}
                </Text>
                {c.appreciation ? (
                  <View style={s.quote}>
                    <Text style={s.quoteText}>“{c.appreciation}”</Text>
                  </View>
                ) : null}
              </View>
            );
          }}
        />
      )}

      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <PrimaryButton
          title="Create request"
          onPress={() => navigation.navigate("CreateHelpRequest")}
        />
      </View>
    </View>
  );
}
