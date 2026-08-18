import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  ScrollView
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getFeed, type FeedItem } from "../../api/home.api";
import { deletePost } from "../../api/posts.api";
import { getErrorStatus } from "../../api/client";
import { mergeById } from "../../utils/mergeById";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { MasterDataSuggestInput } from "../../components/masterData/MasterDataSuggestInput";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { textFieldCompact } from "../../theme/textField";
import { timeAgo } from "../../utils/timeAgo";
import { appAlert } from "../../utils/appAlert";
import {
  JOB_EMPLOYMENT_TYPES,
  formatEmploymentType,
  formatJobSalary
} from "../../constants/jobs";

type Mode = "browse" | "mine";
type JobFilter = "open" | "closed" | "all";

const PAGE_SIZE = 20;

function isJobOpen(status: string | null | undefined): boolean {
  return status !== "CLOSED";
}

function companyInitials(name: string | null | undefined, fallback: string): string {
  const raw = (name || fallback || "?").trim();
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return raw.slice(0, 2).toUpperCase();
}

export function JobsHomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, mode: themeMode } = useTheme();
  const [mode, setMode] = useState<Mode>("browse");
  const [filter, setFilter] = useState<JobFilter>("open");
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [locationDraft, setLocationDraft] = useState("");
  const [locationQ, setLocationQ] = useState("");
  const [employmentType, setEmploymentType] = useState<string | null>(null);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = React.useRef(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nextCursorRef = React.useRef<number | null>(null);
  const hasLoadedOnce = React.useRef(false);
  const requestIdRef = React.useRef(0);
  nextCursorRef.current = nextCursor;

  const queryKey = `${mode}|${filter}|${searchQ}|${locationQ}|${employmentType ?? ""}`;

  const load = useCallback(
    async (
      modeLoad: "replace" | "append",
      opts: {
        mode: Mode;
        status: JobFilter;
        q: string;
        location: string;
        employment: string | null;
      }
    ) => {
      const requestId = ++requestIdRef.current;
      try {
        setError(null);
        const cursor = modeLoad === "append" ? nextCursorRef.current ?? undefined : undefined;
        const data = await getFeed({
          limit: PAGE_SIZE,
          sort: "recent",
          postType: "JOB",
          mine: opts.mode === "mine",
          jobStatus: opts.status,
          ...(opts.q ? { q: opts.q } : {}),
          ...(opts.location ? { jobLocation: opts.location } : {}),
          ...(opts.employment ? { jobEmploymentType: opts.employment } : {}),
          ...(cursor != null ? { cursor } : { page: 1 })
        });
        if (requestId !== requestIdRef.current) return;
        setItems((prev) => (modeLoad === "append" ? mergeById(prev, data.items) : data.items));
        setNextCursor(data.nextCursor ?? null);
        hasLoadedOnce.current = true;
      } catch (e) {
        if (requestId !== requestIdRef.current) return;
        const status = getErrorStatus(e);
        if (status === 401) navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        else if (status === 403) navigation.reset({ index: 0, routes: [{ name: "PendingApproval" }] });
        else setError(e instanceof Error ? e.message : "Failed to load jobs");
      }
    },
    [navigation]
  );

  useFocusEffect(
    useCallback(() => {
      const showSpinner = !hasLoadedOnce.current;
      if (showSpinner) setLoading(true);
      setNextCursor(null);
      void load("replace", {
        mode,
        status: filter,
        q: searchQ,
        location: locationQ,
        employment: employmentType
      }).finally(() => {
        if (showSpinner) setLoading(false);
      });
    }, [mode, filter, searchQ, locationQ, employmentType, load])
  );

  const switchMode = useCallback((next: Mode) => {
    if (next === mode) return;
    requestIdRef.current += 1;
    setMode(next);
    setFilter(next === "mine" ? "all" : "open");
    setItems([]);
    setNextCursor(null);
    setError(null);
    hasLoadedOnce.current = false;
    setLoading(true);
  }, [mode]);

  const applySearch = useCallback(() => {
    setSearchQ(searchDraft.trim());
    setLocationQ(locationDraft.trim());
  }, [searchDraft, locationDraft]);

  const clearFilters = useCallback(() => {
    setSearchDraft("");
    setSearchQ("");
    setLocationDraft("");
    setLocationQ("");
    setEmploymentType(null);
    setFilter(mode === "mine" ? "all" : "open");
  }, [mode]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setNextCursor(null);
    await load("replace", {
      mode,
      status: filter,
      q: searchQ,
      location: locationQ,
      employment: employmentType
    });
    setRefreshing(false);
  }, [employmentType, filter, load, locationQ, mode, searchQ]);

  const onEndReached = useCallback(async () => {
    if (!nextCursorRef.current || loadingMoreRef.current || loading) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      await load("append", {
        mode,
        status: filter,
        q: searchQ,
        location: locationQ,
        employment: employmentType
      });
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [employmentType, filter, load, loading, locationQ, mode, searchQ]);

  const statusFilters: { id: JobFilter; label: string }[] = useMemo(
    () => [
      { id: "open", label: "Open" },
      { id: "closed", label: "Closed" },
      { id: "all", label: "All" }
    ],
    []
  );

  const defaultStatus: JobFilter = mode === "mine" ? "all" : "open";
  const hasActiveFilters = Boolean(
    searchQ || locationQ || employmentType || filter !== defaultStatus
  );

  const emptyCopy =
    mode === "mine"
      ? {
          title: "No job posts yet",
          body: "Post your first opening for the community. Tap Post a job below."
        }
      : {
          title: "No matching jobs",
          body: "Try another search, clear filters, or post a new opening for the community."
        };

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
          gap: spacing.sm,
          zIndex: 30,
          elevation: 6
        },
        searchWrap: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.surfaceElevated,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
          gap: spacing.sm
        },
        searchInput: {
          flex: 1,
          ...textFieldCompact,
          color: colors.text
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
        segmentText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
        segmentTextActive: { color: colors.primary, fontWeight: "700" },
        chipScroll: { paddingVertical: 2 },
        chip: {
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderRadius: radius.full,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.background,
          marginRight: spacing.sm
        },
        chipActive: {
          borderColor: "#0D9488",
          backgroundColor: themeMode === "dark" ? "#134E4A" : "#F0FDFA"
        },
        chipText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
        chipTextActive: { color: themeMode === "dark" ? "#5EEAD4" : "#0F766E" },
        clearRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingTop: 2
        },
        clearText: { fontSize: 12, fontWeight: "700", color: colors.primary },
        listContent: {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.xxxl,
          flexGrow: 1
        },
        card: {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.lg,
          marginBottom: spacing.md
        },
        cardPressed: { opacity: 0.92, borderColor: colors.primary + "66" },
        cardTop: { flexDirection: "row", gap: spacing.md },
        avatar: {
          width: 48,
          height: 48,
          borderRadius: 14,
          backgroundColor: themeMode === "dark" ? "#134E4A" : "#CCFBF1",
          alignItems: "center",
          justifyContent: "center"
        },
        avatarText: {
          fontSize: 15,
          fontWeight: "800",
          color: themeMode === "dark" ? "#5EEAD4" : "#0F766E"
        },
        cardMain: { flex: 1, minWidth: 0 },
        titleRow: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 8
        },
        title: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.text, lineHeight: 22 },
        badge: {
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: radius.full,
          backgroundColor: themeMode === "dark" ? "#14532D" : "#DCFCE7"
        },
        badgeClosed: {
          backgroundColor: themeMode === "dark" ? colors.surfaceElevated : "#F1F5F9"
        },
        badgeText: {
          fontSize: 11,
          fontWeight: "700",
          color: themeMode === "dark" ? "#86EFAC" : "#15803D"
        },
        badgeTextClosed: { color: colors.textMuted },
        company: {
          marginTop: 4,
          fontSize: 13,
          fontWeight: "600",
          color: colors.textSecondary
        },
        metaLine: {
          marginTop: spacing.md,
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8
        },
        metaPill: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          backgroundColor: colors.surfaceElevated,
          paddingHorizontal: 9,
          paddingVertical: 5,
          borderRadius: radius.full
        },
        metaPillText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
        desc: {
          marginTop: spacing.sm,
          fontSize: 13,
          lineHeight: 19,
          color: colors.textSecondary
        },
        footerMeta: {
          marginTop: spacing.md,
          paddingTop: spacing.sm,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8
        },
        meta: { flex: 1, fontSize: 12, color: colors.textMuted },
        viewHint: { fontSize: 12, fontWeight: "700", color: colors.primary },
        ownerActions: {
          marginTop: spacing.sm,
          paddingTop: spacing.sm,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          flexDirection: "row",
          gap: 8
        },
        ownerBtn: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          paddingVertical: 10,
          borderRadius: radius.md,
          backgroundColor: colors.surfaceElevated
        },
        ownerBtnPressed: { opacity: 0.85 },
        ownerBtnText: { fontSize: 13, fontWeight: "700" },
        empty: { alignItems: "center", paddingTop: 56, paddingHorizontal: spacing.xl },
        emptyIcon: {
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: themeMode === "dark" ? "#134E4A" : "#F0FDFA",
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
        footer: {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          backgroundColor: colors.surface
        },
        center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
        errorText: { color: colors.error, textAlign: "center", marginBottom: spacing.md }
      }),
    [colors, themeMode]
  );

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => {
      const open = isJobOpen(item.jobStatus);
      const employment = formatEmploymentType(item.jobEmploymentType);
      const salary = formatJobSalary(item.jobSalaryMin, item.jobSalaryMax);
      const initials = companyInitials(item.jobCompany, item.author.name);

      return (
        <View style={s.card}>
          <Pressable
            style={({ pressed }) => [pressed && s.cardPressed]}
            onPress={() => navigation.navigate("PostDetail", { postId: item.postId })}
            accessibilityRole="button"
            accessibilityLabel={`Open job ${item.title}`}
          >
            <View style={s.cardTop}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{initials}</Text>
              </View>
              <View style={s.cardMain}>
                <View style={s.titleRow}>
                  <Text style={s.title} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <View style={[s.badge, !open && s.badgeClosed]}>
                    <Text style={[s.badgeText, !open && s.badgeTextClosed]}>
                      {open ? "Open" : "Closed"}
                    </Text>
                  </View>
                </View>
                {item.jobCompany ? (
                  <Text style={s.company} numberOfLines={1}>
                    {item.jobCompany}
                  </Text>
                ) : (
                  <Text style={s.company} numberOfLines={1}>
                    {mode === "mine" ? "Your posting" : `Posted by ${item.author.name}`}
                  </Text>
                )}
              </View>
            </View>

            <View style={s.metaLine}>
              {item.jobLocation ? (
                <View style={s.metaPill}>
                  <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
                  <Text style={s.metaPillText}>{item.jobLocation}</Text>
                </View>
              ) : null}
              {employment ? (
                <View style={s.metaPill}>
                  <Ionicons name="briefcase-outline" size={13} color={colors.textSecondary} />
                  <Text style={s.metaPillText}>{employment}</Text>
                </View>
              ) : null}
              {salary ? (
                <View style={s.metaPill}>
                  <Ionicons name="cash-outline" size={13} color={colors.textSecondary} />
                  <Text style={s.metaPillText}>{salary}</Text>
                </View>
              ) : null}
            </View>

            {item.description ? (
              <Text style={s.desc} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}

            <View style={s.footerMeta}>
              <Text style={s.meta} numberOfLines={1}>
                {mode === "mine"
                  ? timeAgo(item.createdAt)
                  : `${item.author.name} · ${timeAgo(item.createdAt)}`}
                {item.counts.comments > 0 ? ` · ${item.counts.comments} comments` : ""}
              </Text>
              <Text style={s.viewHint}>{mode === "mine" ? "Manage" : "View"}</Text>
            </View>
          </Pressable>

          {mode === "mine" ? (
            <View style={s.ownerActions}>
              <Pressable
                style={({ pressed }) => [s.ownerBtn, pressed && s.ownerBtnPressed]}
                onPress={() =>
                  navigation.navigate("CreatePost", {
                    initialPostType: "JOB",
                    editPostId: item.postId
                  })
                }
                accessibilityRole="button"
                accessibilityLabel="Edit job"
              >
                <Ionicons name="create-outline" size={16} color={colors.primary} />
                <Text style={[s.ownerBtnText, { color: colors.primary }]}>Edit</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [s.ownerBtn, pressed && s.ownerBtnPressed]}
                onPress={() => {
                  appAlert("Delete this job?", "This permanently removes the listing.", [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: async () => {
                        try {
                          await deletePost(item.postId);
                          setItems((prev) => prev.filter((p) => p.postId !== item.postId));
                        } catch (err) {
                          appAlert(
                            "Error",
                            (err as any)?.response?.data?.message ?? "Could not delete job."
                          );
                        }
                      }
                    }
                  ]);
                }}
                accessibilityRole="button"
                accessibilityLabel="Delete job"
              >
                <Ionicons name="trash-outline" size={16} color={colors.error} />
                <Text style={[s.ownerBtnText, { color: colors.error }]}>Delete</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      );
    },
    [colors.error, colors.primary, colors.surfaceElevated, colors.textSecondary, mode, navigation, s]
  );

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + spacing.xs }]}>
        <Pressable
          style={s.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={s.headerTextCol}>
          <Text style={s.headerTitle}>Jobs</Text>
          <Text style={s.headerSub}>
            {mode === "mine" ? "Your openings & closed roles" : "Find openings in the community"}
          </Text>
        </View>
        <Pressable
          style={s.backBtn}
          onPress={() => navigation.navigate("CreatePost", { initialPostType: "JOB" })}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Post a job"
        >
          <Ionicons name="add" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <View style={s.toolbar}>
        <View style={s.segment}>
          {(
            [
              ["browse", "Browse"],
              ["mine", "My jobs"]
            ] as const
          ).map(([id, label]) => {
            const active = mode === id;
            return (
              <Pressable
                key={id}
                style={[s.segmentBtn, active && s.segmentBtnActive]}
                onPress={() => switchMode(id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={label}
              >
                <Text style={[s.segmentText, active && s.segmentTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder={mode === "mine" ? "Search your jobs" : "Search title or company"}
            placeholderTextColor={colors.textMuted}
            value={searchDraft}
            onChangeText={setSearchDraft}
            returnKeyType="search"
            onSubmitEditing={applySearch}
          />
          {searchDraft.length > 0 ? (
            <Pressable
              onPress={() => {
                setSearchDraft("");
                setSearchQ("");
              }}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : (
            <Pressable onPress={applySearch} hitSlop={8}>
              <Ionicons name="arrow-forward-circle" size={22} color={colors.primary} />
            </Pressable>
          )}
        </View>

        <MasterDataSuggestInput
          value={locationDraft}
          onChangeText={setLocationDraft}
          placeholder="Location (district / town)"
          types={["DISTRICT", "TOWN", "TALUK"]}
          onSelect={(label) => {
            setLocationDraft(label);
            setLocationQ(label);
          }}
          onSubmitEditing={applySearch}
        />

        <View style={s.segment}>
          {statusFilters.map((f) => {
            const active = filter === f.id;
            return (
              <Pressable
                key={f.id}
                style={[s.segmentBtn, active && s.segmentBtnActive]}
                onPress={() => setFilter(f.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={f.label}
              >
                <Text style={[s.segmentText, active && s.segmentTextActive]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipScroll}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            style={[s.chip, !employmentType && s.chipActive]}
            onPress={() => setEmploymentType(null)}
          >
            <Text style={[s.chipText, !employmentType && s.chipTextActive]}>Any type</Text>
          </Pressable>
          {JOB_EMPLOYMENT_TYPES.map((t) => {
            const active = employmentType === t.value;
            return (
              <Pressable
                key={t.value}
                style={[s.chip, active && s.chipActive]}
                onPress={() => setEmploymentType(active ? null : t.value)}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {hasActiveFilters ? (
          <Pressable style={s.clearRow} onPress={clearFilters}>
            <Text style={s.clearText}>Clear filters</Text>
          </Pressable>
        ) : null}
      </View>

      {loading && items.length === 0 ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error && items.length === 0 ? (
        <View style={s.center}>
          <Text style={s.errorText}>{error}</Text>
          <PrimaryButton
            title="Retry"
            onPress={() => {
              hasLoadedOnce.current = false;
              setLoading(true);
              void load("replace", {
                mode,
                status: filter,
                q: searchQ,
                location: locationQ,
                employment: employmentType
              }).finally(() => setLoading(false));
            }}
          />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.postId)}
          extraData={queryKey}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              colors={[colors.primary]}
            />
          }
          onEndReached={() => void onEndReached()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} />
            ) : null
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <Ionicons
                  name={mode === "mine" ? "document-text-outline" : "briefcase-outline"}
                  size={32}
                  color="#0D9488"
                />
              </View>
              <Text style={s.emptyTitle}>{emptyCopy.title}</Text>
              <Text style={s.emptyText}>{emptyCopy.body}</Text>
            </View>
          }
        />
      )}

      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <PrimaryButton
          title="Post a job"
          onPress={() => navigation.navigate("CreatePost", { initialPostType: "JOB" })}
        />
      </View>
    </View>
  );
}
