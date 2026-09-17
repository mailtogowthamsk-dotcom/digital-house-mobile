import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getFeed, type FeedItem } from "../../api/home.api";
import {
  listMyJobApplications,
  withdrawJobInterest,
  type MyJobApplication
} from "../../api/posts.api";
import { getErrorStatus } from "../../api/client";
import { mergeById } from "../../utils/mergeById";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { MasterDataSuggestInput } from "../../components/masterData/MasterDataSuggestInput";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { textFieldCompact } from "../../theme/textField";
import { timeAgo } from "../../utils/timeAgo";
import { appAlert } from "../../utils/appAlert";
import { HeaderBackButton } from "../../components/ui/HeaderBackButton";
import type { RootStackParamList } from "../../navigation/types";
import {
  JOB_EMPLOYMENT_TYPES,
  JOB_WORK_MODES,
  formatEmploymentType,
  formatJobSalary,
  formatWorkMode,
  formatJobExperience,
  formatJobDeadline,
  deriveJobListingStatus,
  formatApplicationStatus,
  type JobListingStatus
} from "../../constants/jobs";

type Mode = "browse" | "mine" | "applications";
type JobFilter = "open" | "closed" | "expired" | "all";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 400;

function companyInitials(name: string | null | undefined, fallback: string): string {
  const raw = (name || fallback || "?").trim();
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return raw.slice(0, 2).toUpperCase();
}

function listingBadgeStyle(
  status: JobListingStatus,
  themeMode: "light" | "dark"
): { bg: string; text: string; label: string } {
  if (status === "OPEN") {
    return {
      bg: themeMode === "dark" ? "#14532D" : "#DCFCE7",
      text: themeMode === "dark" ? "#86EFAC" : "#15803D",
      label: "Open"
    };
  }
  if (status === "EXPIRED") {
    return {
      bg: themeMode === "dark" ? "rgba(217,119,6,0.25)" : "#FEF3C7",
      text: themeMode === "dark" ? "#FCD34D" : "#B45309",
      label: "Expired"
    };
  }
  return {
    bg: themeMode === "dark" ? "#334155" : "#F1F5F9",
    text: themeMode === "dark" ? "#94A3B8" : "#64748B",
    label: "Closed"
  };
}

export function JobsHomeScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, "JobsHome">>();
  const insets = useSafeAreaInsets();
  const { colors, mode: themeMode } = useTheme();

  const [mode, setMode] = useState<Mode>(() => route.params?.initialMode ?? "browse");
  const [filter, setFilter] = useState<JobFilter>(() =>
    route.params?.initialMode === "mine" ? "all" : "open"
  );
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [locationDraft, setLocationDraft] = useState("");
  const [locationQ, setLocationQ] = useState("");
  const [employmentType, setEmploymentType] = useState<string | null>(null);
  const [workMode, setWorkMode] = useState<string | null>(null);
  const [categoryQ, setCategoryQ] = useState("");
  const [experienceQ, setExperienceQ] = useState("");
  const [salaryMinQ, setSalaryMinQ] = useState<number | null>(null);
  const [salaryMaxQ, setSalaryMaxQ] = useState<number | null>(null);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [filterDraftStatus, setFilterDraftStatus] = useState<JobFilter>("open");
  const [filterDraftEmployment, setFilterDraftEmployment] = useState<string | null>(null);
  const [filterDraftWorkMode, setFilterDraftWorkMode] = useState<string | null>(null);
  const [filterDraftCategory, setFilterDraftCategory] = useState("");
  const [filterDraftExperience, setFilterDraftExperience] = useState("");
  const [filterDraftSalaryMin, setFilterDraftSalaryMin] = useState("");
  const [filterDraftSalaryMax, setFilterDraftSalaryMax] = useState("");

  const [items, setItems] = useState<FeedItem[]>([]);
  const [applications, setApplications] = useState<MyJobApplication[]>([]);
  const [applicationsTotal, setApplicationsTotal] = useState(0);
  const [applicationsPage, setApplicationsPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = React.useRef(false);
  const [nextCursor, setNextCursor] = useState<number | string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nextCursorRef = React.useRef<number | string | null>(null);
  const hasLoadedOnce = React.useRef(false);
  const requestIdRef = React.useRef(0);
  nextCursorRef.current = nextCursor;

  useEffect(() => {
    const initial = route.params?.initialMode;
    if (initial) {
      setMode(initial);
      setFilter(initial === "mine" ? "all" : initial === "applications" ? "all" : "open");
    }
  }, [route.params?.initialMode]);

  useEffect(() => {
    const t = setTimeout(() => setSearchQ(searchDraft.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchDraft]);

  useEffect(() => {
    const t = setTimeout(() => setLocationQ(locationDraft.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [locationDraft]);

  const queryKey = `${mode}|${filter}|${searchQ}|${locationQ}|${employmentType ?? ""}|${workMode ?? ""}|${categoryQ}|${experienceQ}|${salaryMinQ ?? ""}|${salaryMaxQ ?? ""}`;

  const loadFeed = useCallback(
    async (
      modeLoad: "replace" | "append",
      opts: {
        mode: Mode;
        status: JobFilter;
        q: string;
        location: string;
        employment: string | null;
        work: string | null;
        category: string;
        experience: string;
        salMin: number | null;
        salMax: number | null;
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
          ...(opts.work ? { jobWorkMode: opts.work } : {}),
          ...(opts.category ? { jobCategory: opts.category } : {}),
          ...(opts.experience ? { jobExperience: opts.experience } : {}),
          ...(opts.salMin != null ? { jobSalaryMin: opts.salMin } : {}),
          ...(opts.salMax != null ? { jobSalaryMax: opts.salMax } : {}),
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

  const loadApplications = useCallback(
    async (pageLoad: "replace" | "append", page: number) => {
      const requestId = ++requestIdRef.current;
      try {
        setError(null);
        const data = await listMyJobApplications({ page, limit: PAGE_SIZE });
        if (requestId !== requestIdRef.current) return;
        setApplications((prev) => (pageLoad === "append" ? [...prev, ...data.items] : data.items));
        setApplicationsTotal(data.total);
        setApplicationsPage(data.page);
        hasLoadedOnce.current = true;
      } catch (e) {
        if (requestId !== requestIdRef.current) return;
        const status = getErrorStatus(e);
        if (status === 401) navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        else if (status === 403) navigation.reset({ index: 0, routes: [{ name: "PendingApproval" }] });
        else setError(e instanceof Error ? e.message : "Failed to load applications");
      }
    },
    [navigation]
  );

  const feedOpts = useMemo(
    () => ({
      mode,
      status: filter,
      q: searchQ,
      location: locationQ,
      employment: employmentType,
      work: workMode,
      category: categoryQ,
      experience: experienceQ,
      salMin: salaryMinQ,
      salMax: salaryMaxQ
    }),
    [
      categoryQ,
      employmentType,
      experienceQ,
      filter,
      locationQ,
      mode,
      salaryMaxQ,
      salaryMinQ,
      searchQ,
      workMode
    ]
  );

  useFocusEffect(
    useCallback(() => {
      const showSpinner = !hasLoadedOnce.current;
      if (showSpinner) setLoading(true);
      setNextCursor(null);
      const run =
        mode === "applications"
          ? loadApplications("replace", 1)
          : loadFeed("replace", feedOpts);
      void run.finally(() => {
        if (showSpinner) setLoading(false);
      });
    }, [feedOpts, loadApplications, loadFeed, mode])
  );

  const switchMode = useCallback(
    (next: Mode) => {
      if (next === mode) return;
      requestIdRef.current += 1;
      setMode(next);
      setFilter(next === "mine" ? "all" : next === "applications" ? "all" : "open");
      setItems([]);
      setApplications([]);
      setNextCursor(null);
      setError(null);
      hasLoadedOnce.current = false;
      setLoading(true);
    },
    [mode]
  );

  const defaultStatus: JobFilter = mode === "mine" ? "all" : "open";

  const activeFilterCount = useMemo(() => {
    if (mode === "applications") return 0;
    let n = 0;
    if (filter !== defaultStatus) n += 1;
    if (employmentType) n += 1;
    if (workMode) n += 1;
    if (categoryQ.trim()) n += 1;
    if (experienceQ.trim()) n += 1;
    if (salaryMinQ != null) n += 1;
    if (salaryMaxQ != null) n += 1;
    return n;
  }, [
    categoryQ,
    defaultStatus,
    employmentType,
    experienceQ,
    filter,
    mode,
    salaryMaxQ,
    salaryMinQ,
    workMode
  ]);

  const hasActiveFilters = Boolean(
    searchQ ||
      locationQ ||
      activeFilterCount > 0
  );

  const openFilterModal = useCallback(() => {
    setFilterDraftStatus(filter);
    setFilterDraftEmployment(employmentType);
    setFilterDraftWorkMode(workMode);
    setFilterDraftCategory(categoryQ);
    setFilterDraftExperience(experienceQ);
    setFilterDraftSalaryMin(salaryMinQ != null ? String(salaryMinQ) : "");
    setFilterDraftSalaryMax(salaryMaxQ != null ? String(salaryMaxQ) : "");
    setFilterModalOpen(true);
  }, [
    categoryQ,
    employmentType,
    experienceQ,
    filter,
    salaryMaxQ,
    salaryMinQ,
    workMode
  ]);

  const applyFilterModal = useCallback(() => {
    const min = filterDraftSalaryMin.trim() ? Math.floor(Number(filterDraftSalaryMin.trim())) : null;
    const max = filterDraftSalaryMax.trim() ? Math.floor(Number(filterDraftSalaryMax.trim())) : null;
    setFilter(filterDraftStatus);
    setEmploymentType(filterDraftEmployment);
    setWorkMode(filterDraftWorkMode);
    setCategoryQ(filterDraftCategory.trim());
    setExperienceQ(filterDraftExperience.trim());
    setSalaryMinQ(min != null && Number.isFinite(min) ? min : null);
    setSalaryMaxQ(max != null && Number.isFinite(max) ? max : null);
    setFilterModalOpen(false);
  }, [
    filterDraftCategory,
    filterDraftEmployment,
    filterDraftExperience,
    filterDraftSalaryMax,
    filterDraftSalaryMin,
    filterDraftStatus,
    filterDraftWorkMode
  ]);

  const clearFilters = useCallback(() => {
    setSearchDraft("");
    setSearchQ("");
    setLocationDraft("");
    setLocationQ("");
    setEmploymentType(null);
    setWorkMode(null);
    setCategoryQ("");
    setExperienceQ("");
    setSalaryMinQ(null);
    setSalaryMaxQ(null);
    setFilter(mode === "mine" ? "all" : "open");
  }, [mode]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setNextCursor(null);
    if (mode === "applications") {
      await loadApplications("replace", 1);
    } else {
      await loadFeed("replace", feedOpts);
    }
    setRefreshing(false);
  }, [feedOpts, loadApplications, loadFeed, mode]);

  const onEndReached = useCallback(async () => {
    if (mode === "applications") {
      if (applications.length >= applicationsTotal || loadingMoreRef.current || loading) return;
      loadingMoreRef.current = true;
      setLoadingMore(true);
      try {
        await loadApplications("append", applicationsPage + 1);
      } finally {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
      return;
    }
    if (!nextCursorRef.current || loadingMoreRef.current || loading) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      await loadFeed("append", feedOpts);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [
    applications.length,
    applicationsPage,
    applicationsTotal,
    feedOpts,
    loadApplications,
    loadFeed,
    loading,
    mode
  ]);

  const headerSubtitle = useMemo(() => {
    if (mode === "mine") return "Your openings & applicants";
    if (mode === "applications") return "Jobs you have applied to";
    return "Find openings in the community";
  }, [mode]);

  const emptyCopy = useMemo(() => {
    if (mode === "mine") {
      return {
        title: "No job posts yet",
        body: "Post your first opening for the community. Tap Post a job below."
      };
    }
    if (mode === "applications") {
      return {
        title: "No applications yet",
        body: "Browse jobs and tap Apply on a listing to track your status here."
      };
    }
    return {
      title: "No matching jobs",
      body: "Try another search, clear filters, or post a new opening for the community."
    };
  }, [mode]);

  const handleWithdraw = useCallback(
    (app: MyJobApplication) => {
      if (app.status === "SELECTED" || app.status === "WITHDRAWN") return;
      appAlert("Withdraw application?", "You can apply again later if the job is still open.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Withdraw",
          style: "destructive",
          onPress: async () => {
            try {
              await withdrawJobInterest(app.job.id, app.id);
              setApplications((prev) =>
                prev.map((x) => (x.id === app.id ? { ...x, status: "WITHDRAWN" } : x))
              );
            } catch (e) {
              appAlert(
                "Error",
                (e as any)?.response?.data?.message ?? "Could not withdraw application."
              );
            }
          }
        }
      ]);
    },
    []
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
          padding: 2,
          gap: 1
        },
        segmentBtn: {
          flex: 1,
          paddingVertical: 8,
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
        segmentText: { fontSize: 11, fontWeight: "600", color: colors.textSecondary },
        segmentTextActive: { color: colors.primary, fontWeight: "700" },
        filterRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
        filterBtn: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 10,
          paddingHorizontal: spacing.md,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surfaceElevated
        },
        filterBadge: {
          minWidth: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: "#0D9488",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 4
        },
        filterBadgeText: { fontSize: 10, fontWeight: "800", color: "#fff" },
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
          borderRadius: radius.full
        },
        badgeText: {
          fontSize: 11,
          fontWeight: "700"
        },
        appliedRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 6,
          marginTop: 6,
          alignItems: "center"
        },
        appliedPill: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          backgroundColor: themeMode === "dark" ? "rgba(22,163,74,0.2)" : "#DCFCE7",
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: radius.full
        },
        appliedText: { fontSize: 11, fontWeight: "700", color: "#15803D" },
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
        ownerRow: {
          marginTop: spacing.sm,
          paddingTop: spacing.sm,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8
        },
        applicantsBtn: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: radius.md,
          backgroundColor: themeMode === "dark" ? "#134E4A" : "#F0FDFA"
        },
        applicantsBtnText: { fontSize: 13, fontWeight: "700", color: "#0F766E" },
        appActions: {
          marginTop: spacing.sm,
          flexDirection: "row",
          gap: 8
        },
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
        errorText: { color: colors.error, textAlign: "center", marginBottom: spacing.md },
        modalSheet: {
          backgroundColor: colors.surface,
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
          padding: spacing.lg,
          maxHeight: "85%"
        },
        modalTitle: { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: spacing.md },
        modalLabel: {
          fontSize: 12,
          fontWeight: "700",
          color: colors.textSecondary,
          marginTop: spacing.sm,
          marginBottom: 6
        },
        modalInput: {
          ...textFieldCompact,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          paddingVertical: 10,
          color: colors.text,
          backgroundColor: colors.surfaceElevated
        },
        modalChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
        modalChip: {
          paddingHorizontal: 10,
          paddingVertical: 7,
          borderRadius: radius.full,
          borderWidth: 1,
          borderColor: colors.border
        },
        modalChipActive: {
          borderColor: "#0D9488",
          backgroundColor: themeMode === "dark" ? "#134E4A" : "#F0FDFA"
        },
        modalChipText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
        modalChipTextActive: { color: themeMode === "dark" ? "#5EEAD4" : "#0F766E" },
        salaryRow: { flexDirection: "row", alignItems: "center", gap: 8 }
      }),
    [colors, themeMode]
  );

  const renderJobItem = useCallback(
    ({ item }: { item: FeedItem }) => {
      const listingStatus = deriveJobListingStatus(item.jobStatus, item.jobApplicationDeadline);
      const badge = listingBadgeStyle(listingStatus, themeMode);
      const employment = formatEmploymentType(item.jobEmploymentType);
      const work = formatWorkMode(item.jobWorkMode);
      const salary = formatJobSalary(item.jobSalaryMin, item.jobSalaryMax);
      const experience = formatJobExperience(item.jobExperience);
      const deadlineLabel = formatJobDeadline(item.jobApplicationDeadline);
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
                  <View style={[s.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[s.badgeText, { color: badge.text }]}>{badge.label}</Text>
                  </View>
                </View>
                <Text style={s.company} numberOfLines={1}>
                  {item.jobCompany?.trim() ||
                    (mode === "mine" ? "Your posting" : `Posted by ${item.author.name}`)}
                </Text>
                {mode === "browse" && item.jobInterestedByMe ? (
                  <View style={s.appliedRow}>
                    <View style={s.appliedPill}>
                      <Ionicons name="checkmark-circle" size={12} color="#15803D" />
                      <Text style={s.appliedText}>Applied</Text>
                    </View>
                    {item.jobApplicationStatus ? (
                      <Text style={{ fontSize: 11, fontWeight: "600", color: colors.textMuted }}>
                        {formatApplicationStatus(item.jobApplicationStatus)}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
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
              {work ? (
                <View style={s.metaPill}>
                  <Ionicons name="business-outline" size={13} color={colors.textSecondary} />
                  <Text style={s.metaPillText}>{work}</Text>
                </View>
              ) : null}
              {salary ? (
                <View style={s.metaPill}>
                  <Ionicons name="cash-outline" size={13} color={colors.textSecondary} />
                  <Text style={s.metaPillText}>{salary}</Text>
                </View>
              ) : null}
              {experience ? (
                <View style={s.metaPill}>
                  <Ionicons name="ribbon-outline" size={13} color={colors.textSecondary} />
                  <Text style={s.metaPillText}>{experience}</Text>
                </View>
              ) : null}
            </View>

            <View style={s.footerMeta}>
              <Text style={s.meta} numberOfLines={2}>
                Posted {timeAgo(item.createdAt)}
                {deadlineLabel ? ` · ${deadlineLabel}` : ""}
              </Text>
              <Text style={s.viewHint}>View</Text>
            </View>
          </Pressable>

          {mode === "mine" ? (
            <View style={s.ownerRow}>
              <Text style={s.meta}>
                {(item.jobApplicationCount ?? 0) > 0
                  ? `${item.jobApplicationCount} applicant${item.jobApplicationCount === 1 ? "" : "s"}`
                  : "No applicants yet"}
              </Text>
              <Pressable
                style={({ pressed }) => [s.applicantsBtn, pressed && { opacity: 0.88 }]}
                onPress={() =>
                  navigation.navigate("JobApplicants", {
                    postId: item.postId,
                    jobTitle: item.title
                  })
                }
              >
                <Ionicons name="people-outline" size={16} color="#0F766E" />
                <Text style={s.applicantsBtnText}>View Applicants</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      );
    },
    [colors.textMuted, colors.textSecondary, mode, navigation, s, themeMode]
  );

  const renderApplicationItem = useCallback(
    ({ item }: { item: MyJobApplication }) => {
      const listingStatus = deriveJobListingStatus(
        item.job.job_status,
        item.job.application_deadline
      );
      const badge = listingBadgeStyle(listingStatus, themeMode);
      const canWithdraw = item.status !== "SELECTED" && item.status !== "WITHDRAWN";

      return (
        <View style={s.card}>
          <Text style={s.title}>{item.job.title}</Text>
          {item.job.company ? (
            <Text style={s.company}>{item.job.company}</Text>
          ) : null}
          {item.job.location ? (
            <View style={[s.metaLine, { marginTop: spacing.sm }]}>
              <View style={s.metaPill}>
                <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
                <Text style={s.metaPillText}>{item.job.location}</Text>
              </View>
            </View>
          ) : null}
          <View style={[s.appliedRow, { marginTop: spacing.sm }]}>
            <View style={s.appliedPill}>
              <Text style={s.appliedText}>{formatApplicationStatus(item.status)}</Text>
            </View>
            <View style={[s.badge, { backgroundColor: badge.bg }]}>
              <Text style={[s.badgeText, { color: badge.text }]}>{badge.label}</Text>
            </View>
          </View>
          <Text style={[s.meta, { marginTop: spacing.sm }]}>
            Applied {timeAgo(item.created_at)}
          </Text>
          <View style={s.appActions}>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                title="View Job"
                variant="secondary"
                onPress={() => navigation.navigate("PostDetail", { postId: item.job.id })}
              />
            </View>
            {canWithdraw ? (
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  title="Withdraw"
                  variant="secondary"
                  onPress={() => handleWithdraw(item)}
                />
              </View>
            ) : null}
          </View>
        </View>
      );
    },
    [colors.textSecondary, handleWithdraw, navigation, s, themeMode]
  );

  const listData: (FeedItem | MyJobApplication)[] =
    mode === "applications" ? applications : items;

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + spacing.xs }]}>
        <HeaderBackButton onPress={() => navigation.goBack()} />
        <View style={s.headerTextCol}>
          <Text style={s.headerTitle}>Jobs</Text>
          <Text style={s.headerSub}>{headerSubtitle}</Text>
        </View>
      </View>

      <View style={s.toolbar}>
        <View style={s.segment}>
          {(
            [
              ["browse", "Browse"],
              ["mine", "My Jobs"],
              ["applications", "Applications"]
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
                <Text style={[s.segmentText, active && s.segmentTextActive]} numberOfLines={1}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {mode !== "applications" ? (
          <>
            <View style={s.searchWrap}>
              <Ionicons name="search-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={s.searchInput}
                placeholder={mode === "mine" ? "Search your jobs" : "Search title or company"}
                placeholderTextColor={colors.textMuted}
                value={searchDraft}
                onChangeText={setSearchDraft}
                returnKeyType="search"
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
              ) : null}
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
            />

            <View style={s.filterRow}>
              <Pressable style={s.filterBtn} onPress={openFilterModal}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="options-outline" size={18} color={colors.text} />
                  <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>Filters</Text>
                  {activeFilterCount > 0 ? (
                    <View style={s.filterBadge}>
                      <Text style={s.filterBadgeText}>{activeFilterCount}</Text>
                    </View>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            </View>

            {hasActiveFilters ? (
              <Pressable style={s.clearRow} onPress={clearFilters}>
                <Text style={s.clearText}>Clear all</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
      </View>

      {loading && listData.length === 0 ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error && listData.length === 0 ? (
        <View style={s.center}>
          <Text style={s.errorText}>{error}</Text>
          <PrimaryButton
            title="Retry"
            onPress={() => {
              hasLoadedOnce.current = false;
              setLoading(true);
              const run =
                mode === "applications"
                  ? loadApplications("replace", 1)
                  : loadFeed("replace", feedOpts);
              void run.finally(() => setLoading(false));
            }}
          />
        </View>
      ) : (
        <FlatList<FeedItem | MyJobApplication>
          data={listData}
          keyExtractor={(item) =>
            mode === "applications"
              ? String((item as MyJobApplication).id)
              : String((item as FeedItem).postId)
          }
          extraData={mode === "applications" ? applications.length : queryKey}
          renderItem={(info) =>
            mode === "applications"
              ? renderApplicationItem({ item: info.item as MyJobApplication })
              : renderJobItem({ item: info.item as FeedItem })
          }
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
                  name={
                    mode === "applications"
                      ? "document-text-outline"
                      : mode === "mine"
                        ? "briefcase-outline"
                        : "search-outline"
                  }
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

      <Modal
        visible={filterModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setFilterModalOpen(false)} />
          <ScrollView style={s.modalSheet} keyboardShouldPersistTaps="handled">
            <Text style={s.modalTitle}>Filter jobs</Text>

            <Text style={s.modalLabel}>Listing status</Text>
            <View style={s.modalChipRow}>
              {(
                [
                  ["open", "Open"],
                  ["closed", "Closed"],
                  ["expired", "Expired"],
                  ["all", "All"]
                ] as const
              ).map(([id, label]) => {
                const active = filterDraftStatus === id;
                return (
                  <Pressable
                    key={id}
                    style={[s.modalChip, active && s.modalChipActive]}
                    onPress={() => setFilterDraftStatus(id)}
                  >
                    <Text style={[s.modalChipText, active && s.modalChipTextActive]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={s.modalLabel}>Employment type</Text>
            <View style={s.modalChipRow}>
              <Pressable
                style={[s.modalChip, !filterDraftEmployment && s.modalChipActive]}
                onPress={() => setFilterDraftEmployment(null)}
              >
                <Text style={[s.modalChipText, !filterDraftEmployment && s.modalChipTextActive]}>
                  Any
                </Text>
              </Pressable>
              {JOB_EMPLOYMENT_TYPES.map((t) => {
                const active = filterDraftEmployment === t.value;
                return (
                  <Pressable
                    key={t.value}
                    style={[s.modalChip, active && s.modalChipActive]}
                    onPress={() => setFilterDraftEmployment(active ? null : t.value)}
                  >
                    <Text style={[s.modalChipText, active && s.modalChipTextActive]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={s.modalLabel}>Work mode</Text>
            <View style={s.modalChipRow}>
              <Pressable
                style={[s.modalChip, !filterDraftWorkMode && s.modalChipActive]}
                onPress={() => setFilterDraftWorkMode(null)}
              >
                <Text style={[s.modalChipText, !filterDraftWorkMode && s.modalChipTextActive]}>
                  Any
                </Text>
              </Pressable>
              {JOB_WORK_MODES.map((t) => {
                const active = filterDraftWorkMode === t.value;
                return (
                  <Pressable
                    key={t.value}
                    style={[s.modalChip, active && s.modalChipActive]}
                    onPress={() => setFilterDraftWorkMode(active ? null : t.value)}
                  >
                    <Text style={[s.modalChipText, active && s.modalChipTextActive]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={s.modalLabel}>Category</Text>
            <TextInput
              style={s.modalInput}
              placeholder="e.g. Sales, IT"
              placeholderTextColor={colors.textMuted}
              value={filterDraftCategory}
              onChangeText={setFilterDraftCategory}
            />

            <Text style={s.modalLabel}>Experience</Text>
            <TextInput
              style={s.modalInput}
              placeholder="e.g. 2 years, Fresher"
              placeholderTextColor={colors.textMuted}
              value={filterDraftExperience}
              onChangeText={setFilterDraftExperience}
            />

            <Text style={s.modalLabel}>Salary range (₹ / month)</Text>
            <View style={s.salaryRow}>
              <TextInput
                style={[s.modalInput, { flex: 1 }]}
                placeholder="Min"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                value={filterDraftSalaryMin}
                onChangeText={setFilterDraftSalaryMin}
              />
              <Text style={{ color: colors.textMuted }}>–</Text>
              <TextInput
                style={[s.modalInput, { flex: 1 }]}
                placeholder="Max"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                value={filterDraftSalaryMax}
                onChangeText={setFilterDraftSalaryMax}
              />
            </View>

            <View style={{ marginTop: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl }}>
              <PrimaryButton title="Apply filters" onPress={applyFilterModal} />
              <PrimaryButton
                title="Clear filters"
                variant="secondary"
                onPress={() => {
                  setFilterDraftStatus(defaultStatus);
                  setFilterDraftEmployment(null);
                  setFilterDraftWorkMode(null);
                  setFilterDraftCategory("");
                  setFilterDraftExperience("");
                  setFilterDraftSalaryMin("");
                  setFilterDraftSalaryMax("");
                }}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
