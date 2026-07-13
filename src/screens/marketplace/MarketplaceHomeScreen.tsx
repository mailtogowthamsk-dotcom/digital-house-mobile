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
  ScrollView,
  Image,
  useWindowDimensions
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getFeed, type FeedItem } from "../../api/home.api";
import { getErrorStatus } from "../../api/client";
import { mergeById } from "../../utils/mergeById";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { MasterDataSuggestInput } from "../../components/masterData/MasterDataSuggestInput";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { timeAgo } from "../../utils/timeAgo";
import {
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_CONDITIONS,
  MARKETPLACE_INTENTS,
  formatMarketplaceCategory,
  formatMarketplaceCondition,
  formatMarketplacePrice,
  formatMarketplaceStatus,
  formatMarketplaceExpiry
} from "../../constants/marketplace";

type Mode = "browse" | "mine" | "saved";
type MineFilter =
  | "all"
  | "live"
  | "pending"
  | "changes"
  | "rejected"
  | "sold"
  | "hidden"
  | "expired"
  | "archived";

const PAGE_SIZE = 20;
const ACCENT = "#EA580C";

const MINE_FILTERS: { id: MineFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "live", label: "Live" },
  { id: "pending", label: "Pending" },
  { id: "changes", label: "Changes" },
  { id: "rejected", label: "Rejected" },
  { id: "sold", label: "Sold" },
  { id: "hidden", label: "Hidden" },
  { id: "expired", label: "Expired" },
  { id: "archived", label: "Archived" }
];

export function MarketplaceHomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors, mode: themeMode } = useTheme();
  const [mode, setMode] = useState<Mode>("browse");
  const [mineFilter, setMineFilter] = useState<MineFilter>("all");
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [districtDraft, setDistrictDraft] = useState("");
  const [districtQ, setDistrictQ] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [intent, setIntent] = useState<string | null>(null);
  const [condition, setCondition] = useState<string | null>(null);
  const [priceMinDraft, setPriceMinDraft] = useState("");
  const [priceMaxDraft, setPriceMaxDraft] = useState("");
  const [priceMin, setPriceMin] = useState<number | undefined>();
  const [priceMax, setPriceMax] = useState<number | undefined>();
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = React.useRef(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [browsePage, setBrowsePage] = useState(1);
  const [browseHasMore, setBrowseHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextCursorRef = React.useRef<number | null>(null);
  const hasLoadedOnce = React.useRef(false);
  nextCursorRef.current = nextCursor;
  const browsePageRef = React.useRef(1);
  browsePageRef.current = browsePage;
  const browseHasMoreRef = React.useRef(false);
  browseHasMoreRef.current = browseHasMore;

  const gap = spacing.md;
  const listPad = spacing.lg;
  const tileWidth = (width - listPad * 2 - gap) / 2;

  const load = useCallback(
    async (
      modeLoad: "replace" | "append",
      opts: {
        mode: Mode;
        mineFilter: MineFilter;
        q: string;
        district: string;
        category: string | null;
        intent: string | null;
        condition: string | null;
        priceMin?: number;
        priceMax?: number;
      }
    ) => {
      try {
        setError(null);
        const isBrowse = opts.mode === "browse";
        const cursor =
          !isBrowse && modeLoad === "append" ? nextCursorRef.current ?? undefined : undefined;
        const page = isBrowse
          ? modeLoad === "append"
            ? browsePageRef.current + 1
            : 1
          : cursor != null
            ? undefined
            : 1;
        const data = await getFeed({
          limit: PAGE_SIZE,
          sort: "recent",
          postType: "MARKETPLACE",
          mine: opts.mode === "mine",
          saved: opts.mode === "saved",
          ...(opts.mode === "mine" && opts.mineFilter !== "all"
            ? { marketplaceStatus: opts.mineFilter }
            : {}),
          ...(opts.q ? { q: opts.q } : {}),
          ...(opts.district ? { marketplaceDistrict: opts.district } : {}),
          ...(opts.category ? { marketplaceCategory: opts.category } : {}),
          ...(opts.intent ? { marketplaceIntent: opts.intent } : {}),
          ...(opts.condition ? { marketplaceCondition: opts.condition } : {}),
          ...(opts.priceMin != null ? { marketplacePriceMin: opts.priceMin } : {}),
          ...(opts.priceMax != null ? { marketplacePriceMax: opts.priceMax } : {}),
          ...(isBrowse ? { page: page ?? 1 } : cursor != null ? { cursor } : { page: 1 })
        });
        setItems((prev) => (modeLoad === "append" ? mergeById(prev, data.items) : data.items));
        if (isBrowse) {
          const nextPage = page ?? 1;
          setBrowsePage(nextPage);
          setBrowseHasMore(nextPage * PAGE_SIZE < data.total);
          setNextCursor(null);
        } else {
          setNextCursor(data.nextCursor ?? null);
          setBrowseHasMore(false);
        }
        hasLoadedOnce.current = true;
      } catch (e) {
        const status = getErrorStatus(e);
        if (status === 401) navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        else if (status === 403) navigation.reset({ index: 0, routes: [{ name: "PendingApproval" }] });
        else setError(e instanceof Error ? e.message : "Failed to load marketplace");
      }
    },
    [navigation]
  );

  useFocusEffect(
    useCallback(() => {
      const showSpinner = !hasLoadedOnce.current;
      if (showSpinner) setLoading(true);
      setNextCursor(null);
      setBrowsePage(1);
      setBrowseHasMore(false);
      void load("replace", {
        mode,
        mineFilter,
        q: searchQ,
        district: districtQ,
        category,
        intent,
        condition,
        priceMin,
        priceMax
      }).finally(() => setLoading(false));
    }, [mode, mineFilter, searchQ, districtQ, category, intent, condition, priceMin, priceMax, load])
  );

  const applySearch = useCallback(() => {
    setSearchQ(searchDraft.trim());
    setDistrictQ(districtDraft.trim());
    const min = priceMinDraft.trim() ? Math.floor(Number(priceMinDraft.trim())) : undefined;
    const max = priceMaxDraft.trim() ? Math.floor(Number(priceMaxDraft.trim())) : undefined;
    setPriceMin(min != null && Number.isFinite(min) ? min : undefined);
    setPriceMax(max != null && Number.isFinite(max) ? max : undefined);
  }, [searchDraft, districtDraft, priceMinDraft, priceMaxDraft]);

  const clearFilters = useCallback(() => {
    setSearchDraft("");
    setSearchQ("");
    setDistrictDraft("");
    setDistrictQ("");
    setCategory(null);
    setIntent(null);
    setCondition(null);
    setPriceMinDraft("");
    setPriceMaxDraft("");
    setPriceMin(undefined);
    setPriceMax(undefined);
  }, []);

  const hasActiveFilters = Boolean(
    searchQ || districtQ || category || intent || condition || priceMin != null || priceMax != null
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setNextCursor(null);
    setBrowsePage(1);
    setBrowseHasMore(false);
    await load("replace", {
      mode,
      mineFilter,
      q: searchQ,
      district: districtQ,
      category,
      intent,
      condition,
      priceMin,
      priceMax
    });
    setRefreshing(false);
  }, [
    category,
    condition,
    districtQ,
    intent,
    load,
    mineFilter,
    mode,
    priceMax,
    priceMin,
    searchQ
  ]);

  const onEndReached = useCallback(async () => {
    const canAppend =
      mode === "browse" ? browseHasMoreRef.current : Boolean(nextCursorRef.current);
    if (!canAppend || loadingMoreRef.current || loading) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      await load("append", {
        mode,
        mineFilter,
        q: searchQ,
        district: districtQ,
        category,
        intent,
        condition,
        priceMin,
        priceMax
      });
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [
    category,
    condition,
    districtQ,
    intent,
    load,
    loading,
    mineFilter,
    mode,
    priceMax,
    priceMin,
    searchQ
  ]);

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
          paddingVertical: 12,
          fontSize: 14,
          color: colors.text
        },
        priceRow: { flexDirection: "row", gap: spacing.sm },
        priceInput: {
          flex: 1,
          backgroundColor: colors.surfaceElevated,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          paddingVertical: 11,
          borderWidth: 1,
          borderColor: colors.border,
          fontSize: 14,
          color: colors.text
        },
        filterToggle: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 4
        },
        filterToggleLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
        filterToggleText: { fontSize: 13, fontWeight: "700", color: colors.text },
        filterDot: {
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: ACCENT
        },
        clearText: { fontSize: 12, fontWeight: "700", color: ACCENT },
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
          borderColor: ACCENT,
          backgroundColor: themeMode === "dark" ? "#7C2D12" : "#FFF7ED"
        },
        chipText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
        chipTextActive: { color: themeMode === "dark" ? "#FDBA74" : ACCENT },
        listContent: {
          paddingHorizontal: listPad,
          paddingTop: spacing.md,
          paddingBottom: 100 + insets.bottom,
          gap
        },
        columnWrap: { gap, justifyContent: "space-between" },
        card: {
          width: tileWidth,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: "hidden",
          marginBottom: gap
        },
        cardPressed: { opacity: 0.92, borderColor: ACCENT + "66" },
        thumb: {
          width: "100%",
          height: tileWidth * 0.85,
          backgroundColor: themeMode === "dark" ? colors.surfaceElevated : "#FFF7ED"
        },
        thumbWrap: { position: "relative" },
        thumbBadge: {
          position: "absolute",
          bottom: 8,
          right: 8,
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          backgroundColor: "rgba(15,23,42,0.72)",
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: radius.full
        },
        thumbBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
        featuredPill: {
          position: "absolute",
          top: 8,
          left: 8,
          backgroundColor: "#FEF3C7",
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: radius.full
        },
        featuredText: { fontSize: 10, fontWeight: "800", color: "#B45309" },
        intentPill: {
          position: "absolute",
          top: 8,
          right: 8,
          backgroundColor: "rgba(234,88,12,0.92)",
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: radius.full
        },
        intentText: { fontSize: 10, fontWeight: "800", color: "#fff" },
        cardBody: { padding: spacing.sm + 2, gap: 4 },
        title: { fontSize: 13, fontWeight: "700", color: colors.text, lineHeight: 18 },
        price: { fontSize: 14, fontWeight: "800", color: ACCENT },
        metaRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 4,
          marginTop: 2
        },
        metaPill: {
          backgroundColor: colors.surfaceElevated,
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 6
        },
        metaPillText: { fontSize: 10, fontWeight: "600", color: colors.textSecondary },
        meta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
        statusBadge: {
          alignSelf: "flex-start",
          paddingHorizontal: 7,
          paddingVertical: 2,
          borderRadius: radius.full,
          backgroundColor: "#DCFCE7",
          marginBottom: 2
        },
        statusMuted: { backgroundColor: themeMode === "dark" ? colors.surfaceElevated : "#F1F5F9" },
        statusWarn: { backgroundColor: "#FEF3C7" },
        statusDanger: { backgroundColor: "#FEE2E2" },
        statusText: { fontSize: 10, fontWeight: "700", color: "#15803D" },
        statusTextMuted: { color: colors.textMuted },
        statusTextWarn: { color: "#B45309" },
        statusTextDanger: { color: "#B91C1C" },
        empty: { alignItems: "center", paddingTop: 48, paddingHorizontal: spacing.xl, width: "100%" },
        emptyIcon: {
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: themeMode === "dark" ? "#7C2D12" : "#FFF7ED",
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
    [colors, themeMode, tileWidth, gap, listPad, insets.bottom]
  );

  const badgeFor = (status: string | null | undefined) => {
    if (status === "LIVE") return { box: s.statusBadge, text: s.statusText };
    if (status === "PENDING_REVIEW" || status === "CHANGES_REQUESTED")
      return { box: [s.statusBadge, s.statusWarn], text: s.statusTextWarn };
    if (status === "REJECTED") return { box: [s.statusBadge, s.statusDanger], text: s.statusTextDanger };
    return { box: [s.statusBadge, s.statusMuted], text: s.statusTextMuted };
  };

  const intentShort = (value: string | null | undefined) => {
    if (value === "FREE") return "Free";
    if (value === "EXCHANGE") return "Swap";
    if (value === "SALE") return "Sale";
    return null;
  };

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => {
      const price = formatMarketplacePrice(
        item.marketplaceIntent,
        item.marketplacePrice,
        item.marketplaceNegotiable
      );
      const b = badgeFor(item.marketplaceStatus);
      const expiry = formatMarketplaceExpiry(item.marketplaceExpiresAt);
      const photoCount = item.marketplacePhotoCount ?? item.marketplaceGallery?.length ?? 0;
      const categoryLabel = formatMarketplaceCategory(item.marketplaceCategory);
      const conditionLabel = formatMarketplaceCondition(item.marketplaceCondition);
      const intentLabel = intentShort(item.marketplaceIntent);

      return (
        <Pressable
          style={({ pressed }) => [s.card, pressed && s.cardPressed]}
          onPress={() => navigation.navigate("PostDetail", { postId: item.postId })}
        >
          <View style={s.thumbWrap}>
            {item.mediaUrl ? (
              <Image source={{ uri: item.mediaUrl }} style={s.thumb} resizeMode="cover" />
            ) : (
              <View style={[s.thumb, { alignItems: "center", justifyContent: "center" }]}>
                <Ionicons name="cart-outline" size={28} color={ACCENT} />
              </View>
            )}
            {item.marketplaceFeatured ? (
              <View style={s.featuredPill}>
                <Text style={s.featuredText}>Featured</Text>
              </View>
            ) : null}
            {intentLabel && !item.marketplaceFeatured ? (
              <View style={s.intentPill}>
                <Text style={s.intentText}>{intentLabel}</Text>
              </View>
            ) : null}
            {photoCount > 1 ? (
              <View style={s.thumbBadge}>
                <Ionicons name="images-outline" size={11} color="#fff" />
                <Text style={s.thumbBadgeText}>{photoCount}</Text>
              </View>
            ) : null}
          </View>
          <View style={s.cardBody}>
            {(mode === "mine" || mode === "saved") && item.marketplaceStatus ? (
              <View style={b.box as any}>
                <Text style={b.text}>{formatMarketplaceStatus(item.marketplaceStatus)}</Text>
              </View>
            ) : null}
            <Text style={s.title} numberOfLines={2}>
              {item.title}
            </Text>
            {price ? <Text style={s.price}>{price}</Text> : null}
            <View style={s.metaRow}>
              {categoryLabel ? (
                <View style={s.metaPill}>
                  <Text style={s.metaPillText}>{categoryLabel}</Text>
                </View>
              ) : null}
              {conditionLabel ? (
                <View style={s.metaPill}>
                  <Text style={s.metaPillText}>{conditionLabel}</Text>
                </View>
              ) : null}
            </View>
            <Text style={s.meta} numberOfLines={1}>
              {[item.marketplaceDistrict, expiry, timeAgo(item.createdAt)].filter(Boolean).join(" · ")}
            </Text>
          </View>
        </Pressable>
      );
    },
    [mode, navigation, s]
  );

  const emptyCopy =
    mode === "mine"
      ? {
          title: "No listings yet",
          body: "Post your first item for the community. Tap Sell something below."
        }
      : mode === "saved"
        ? {
            title: "No saved items",
            body: "Bookmark listings while browsing and find them here later."
          }
        : {
            title: "No matching items",
            body: "Try clearing filters or search a different district."
          };

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
          <Text style={s.headerTitle}>Marketplace</Text>
          <Text style={s.headerSub}>Buy, sell & exchange in the community</Text>
        </View>
        <Pressable
          style={s.backBtn}
          onPress={() => navigation.navigate("CreatePost", { initialPostType: "MARKETPLACE" })}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Post an item"
        >
          <Ionicons name="add" size={22} color={ACCENT} />
        </Pressable>
      </View>

      <View style={s.toolbar}>
        <View style={s.segment}>
          {(
            [
              ["browse", "Browse"],
              ["mine", "My listings"],
              ["saved", "Saved"]
            ] as const
          ).map(([id, label]) => {
            const active = mode === id;
            return (
              <Pressable
                key={id}
                style={[s.segmentBtn, active && s.segmentBtnActive]}
                onPress={() => setMode(id)}
              >
                <Text style={[s.segmentText, active && s.segmentTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {mode === "mine" ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chipScroll}
          >
            {MINE_FILTERS.map((f) => {
              const active = mineFilter === f.id;
              return (
                <Pressable
                  key={f.id}
                  style={[s.chip, active && s.chipActive]}
                  onPress={() => setMineFilter(f.id)}
                >
                  <Text style={[s.chipText, active && s.chipTextActive]}>{f.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {mode === "browse" ? (
          <>
            <View style={s.searchWrap}>
              <Ionicons name="search-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={s.searchInput}
                placeholder="Search items…"
                placeholderTextColor={colors.textMuted}
                value={searchDraft}
                onChangeText={setSearchDraft}
                onSubmitEditing={applySearch}
                returnKeyType="search"
              />
              {searchDraft.length > 0 ? (
                <Pressable onPress={() => setSearchDraft("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              ) : (
                <Pressable onPress={applySearch} hitSlop={8}>
                  <Ionicons name="arrow-forward-circle" size={22} color={ACCENT} />
                </Pressable>
              )}
            </View>

            <MasterDataSuggestInput
              value={districtDraft}
              onChangeText={setDistrictDraft}
              placeholder="District / town"
              types={["DISTRICT", "TOWN", "TALUK"]}
              onSelect={(label) => {
                setDistrictDraft(label);
                setDistrictQ(label);
              }}
              onSubmitEditing={applySearch}
            />

            <Pressable
              style={s.filterToggle}
              onPress={() => setFiltersExpanded((v) => !v)}
            >
              <View style={s.filterToggleLeft}>
                <Ionicons
                  name={filtersExpanded ? "options" : "options-outline"}
                  size={18}
                  color={colors.text}
                />
                <Text style={s.filterToggleText}>Filters</Text>
                {hasActiveFilters ? <View style={s.filterDot} /> : null}
              </View>
              <Ionicons
                name={filtersExpanded ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.textMuted}
              />
            </Pressable>

            {filtersExpanded ? (
              <>
                <View style={s.priceRow}>
                  <TextInput
                    style={s.priceInput}
                    placeholder="Min ₹"
                    placeholderTextColor={colors.textMuted}
                    value={priceMinDraft}
                    onChangeText={setPriceMinDraft}
                    keyboardType="number-pad"
                    onSubmitEditing={applySearch}
                  />
                  <TextInput
                    style={s.priceInput}
                    placeholder="Max ₹"
                    placeholderTextColor={colors.textMuted}
                    value={priceMaxDraft}
                    onChangeText={setPriceMaxDraft}
                    keyboardType="number-pad"
                    onSubmitEditing={applySearch}
                  />
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.chipScroll}
                >
                  <Pressable
                    style={[s.chip, !category && s.chipActive]}
                    onPress={() => setCategory(null)}
                  >
                    <Text style={[s.chipText, !category && s.chipTextActive]}>All categories</Text>
                  </Pressable>
                  {MARKETPLACE_CATEGORIES.map((c) => (
                    <Pressable
                      key={c.value}
                      style={[s.chip, category === c.value && s.chipActive]}
                      onPress={() => setCategory(c.value)}
                    >
                      <Text style={[s.chipText, category === c.value && s.chipTextActive]}>
                        {c.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.chipScroll}
                >
                  <Pressable
                    style={[s.chip, !intent && s.chipActive]}
                    onPress={() => setIntent(null)}
                  >
                    <Text style={[s.chipText, !intent && s.chipTextActive]}>All types</Text>
                  </Pressable>
                  {MARKETPLACE_INTENTS.map((i) => (
                    <Pressable
                      key={i.value}
                      style={[s.chip, intent === i.value && s.chipActive]}
                      onPress={() => setIntent(i.value)}
                    >
                      <Text style={[s.chipText, intent === i.value && s.chipTextActive]}>
                        {i.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.chipScroll}
                >
                  <Pressable
                    style={[s.chip, !condition && s.chipActive]}
                    onPress={() => setCondition(null)}
                  >
                    <Text style={[s.chipText, !condition && s.chipTextActive]}>Any condition</Text>
                  </Pressable>
                  {MARKETPLACE_CONDITIONS.map((c) => (
                    <Pressable
                      key={c.value}
                      style={[s.chip, condition === c.value && s.chipActive]}
                      onPress={() => setCondition(c.value)}
                    >
                      <Text style={[s.chipText, condition === c.value && s.chipTextActive]}>
                        {c.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                {hasActiveFilters ? (
                  <Pressable onPress={clearFilters} style={{ alignSelf: "flex-end" }}>
                    <Text style={s.clearText}>Clear filters</Text>
                  </Pressable>
                ) : null}
              </>
            ) : null}
          </>
        ) : null}
      </View>

      {loading && items.length === 0 ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : error && items.length === 0 ? (
        <View style={s.center}>
          <Text style={s.errorText}>{error}</Text>
          <PrimaryButton title="Retry" onPress={() => void onRefresh()} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.postId)}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={items.length > 0 ? s.columnWrap : undefined}
          contentContainerStyle={s.listContent}
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
                <Ionicons name="cart-outline" size={32} color={ACCENT} />
              </View>
              <Text style={s.emptyTitle}>{emptyCopy.title}</Text>
              <Text style={s.emptyText}>{emptyCopy.body}</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color={ACCENT} />
            ) : null
          }
        />
      )}

      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <PrimaryButton
          title="Sell something"
          onPress={() => navigation.navigate("CreatePost", { initialPostType: "MARKETPLACE" })}
        />
      </View>
    </View>
  );
}
