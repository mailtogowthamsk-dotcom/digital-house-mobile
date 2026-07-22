import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  getFeaturedProminentPeople,
  getProminentCategories,
  listProminentPeople,
  type ProminentCategory,
  type ProminentPersonCard,
  type ProminentSort
} from "../../api/prominentPeople.api";
import { getErrorStatus, getImageUrl } from "../../api/client";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { AvatarImage } from "../../components/ui/AvatarImage";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";

const ACCENT = "#1D4ED8";
const ACCENT_SOFT = "#DBEAFE";
const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

function hexWithAlpha(hex: string | null | undefined, alphaHex: string, fallback: string): string {
  if (!hex || !/^#([0-9A-Fa-f]{6})$/.test(hex)) return fallback;
  return `${hex}${alphaHex}`;
}

export function ProminentPeopleHomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors, mode: themeMode } = useTheme();

  const [searchDraft, setSearchDraft] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [categories, setCategories] = useState<ProminentCategory[]>([]);
  const [categoryCode, setCategoryCode] = useState<string>("all");
  const [sort, setSort] = useState<ProminentSort>("latest");
  const [featured, setFeatured] = useState<ProminentPersonCard[]>([]);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [items, setItems] = useState<ProminentPersonCard[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadingMoreRef = useRef(false);
  const hasLoadedOnce = useRef(false);
  const requestIdRef = useRef(0);
  const hasMoreRef = useRef(false);
  const pageRef = useRef(1);
  hasMoreRef.current = hasMore;
  pageRef.current = page;

  const bannerWidth = Math.max(280, width - spacing.lg * 2);
  const cardGap = spacing.md;
  const cardWidth = (width - spacing.lg * 2 - cardGap) / 2;

  useEffect(() => {
    const t = setTimeout(() => setSearchQ(searchDraft.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchDraft]);

  const loadMeta = useCallback(async () => {
    const [cats, feat] = await Promise.all([
      getProminentCategories(),
      getFeaturedProminentPeople(8)
    ]);
    setCategories(cats);
    setFeatured(feat);
    setFeaturedIndex(0);
  }, []);

  const loadPeople = useCallback(
    async (
      modeLoad: "replace" | "append",
      opts: { q: string; category: string; sort: ProminentSort }
    ) => {
      const requestId = ++requestIdRef.current;
      const nextPage = modeLoad === "append" ? pageRef.current + 1 : 1;
      const data = await listProminentPeople({
        q: opts.q || undefined,
        category: opts.category,
        sort: opts.sort,
        page: nextPage,
        limit: PAGE_SIZE
      });
      if (requestId !== requestIdRef.current) return;
      setItems((prev) => (modeLoad === "append" ? [...prev, ...data.items] : data.items));
      setPage(data.page);
      setHasMore(data.hasMore);
      hasLoadedOnce.current = true;
    },
    []
  );

  const loadAll = useCallback(
    async (opts: { q: string; category: string; sort: ProminentSort }) => {
      try {
        setError(null);
        await Promise.all([loadMeta(), loadPeople("replace", opts)]);
      } catch (e) {
        const status = getErrorStatus(e);
        if (status === 401) navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        else if (status === 403)
          navigation.reset({ index: 0, routes: [{ name: "PendingApproval" }] });
        else setError(e instanceof Error ? e.message : "Failed to load prominent people");
      }
    },
    [loadMeta, loadPeople, navigation]
  );

  useFocusEffect(
    useCallback(() => {
      const showSpinner = !hasLoadedOnce.current;
      if (showSpinner) setLoading(true);
      void loadAll({ q: searchQ, category: categoryCode, sort }).finally(() => {
        if (showSpinner) setLoading(false);
      });
    }, [categoryCode, loadAll, searchQ, sort])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll({ q: searchQ, category: categoryCode, sort });
    setRefreshing(false);
  }, [categoryCode, loadAll, searchQ, sort]);

  const onEndReached = useCallback(async () => {
    if (!hasMoreRef.current || loadingMoreRef.current || loading) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      await loadPeople("append", { q: searchQ, category: categoryCode, sort });
    } catch {
      /* keep existing list */
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [categoryCode, loadPeople, loading, searchQ, sort]);

  const openProfile = useCallback(
    (id: number) => navigation.navigate("ProminentPersonProfile", { id }),
    [navigation]
  );

  const onFeaturedScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const idx = Math.round(x / (bannerWidth + spacing.md));
      if (idx >= 0 && idx < featured.length) setFeaturedIndex(idx);
    },
    [bannerWidth, featured.length]
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
        chipScroll: { paddingVertical: 2 },
        chip: {
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: radius.full,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.background,
          marginRight: spacing.sm
        },
        chipActive: {
          borderColor: ACCENT,
          backgroundColor: themeMode === "dark" ? "#1E3A8A" : ACCENT_SOFT
        },
        chipText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
        chipTextActive: {
          color: themeMode === "dark" ? "#93C5FD" : ACCENT,
          fontWeight: "700"
        },
        sortRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.sm
        },
        sortLabel: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
        sortToggle: {
          flexDirection: "row",
          backgroundColor: colors.surfaceElevated,
          borderRadius: radius.md,
          padding: 3,
          gap: 2
        },
        sortBtn: {
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderRadius: radius.sm
        },
        sortBtnActive: {
          backgroundColor: colors.surface,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 2,
          elevation: 1
        },
        sortText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
        sortTextActive: { color: ACCENT, fontWeight: "700" },
        listContent: {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.xxxl,
          flexGrow: 1
        },
        sectionTitle: {
          fontSize: 13,
          fontWeight: "800",
          color: colors.text,
          letterSpacing: 0.3,
          marginBottom: spacing.sm
        },
        featuredWrap: { marginBottom: spacing.lg },
        banner: {
          width: bannerWidth,
          borderRadius: radius.xl,
          overflow: "hidden",
          backgroundColor: colors.surface,
          marginRight: spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: themeMode === "dark" ? 0.35 : 0.1,
          shadowRadius: 12,
          elevation: 4
        },
        bannerImage: { width: "100%", height: 150, backgroundColor: colors.surfaceElevated },
        bannerBody: { padding: spacing.md, gap: 4 },
        bannerName: { fontSize: 17, fontWeight: "800", color: colors.text },
        bannerRole: { fontSize: 13, fontWeight: "600", color: ACCENT },
        bannerDesc: {
          fontSize: 12,
          lineHeight: 17,
          color: colors.textSecondary,
          marginTop: 2
        },
        viewProfileBtn: {
          marginTop: spacing.sm,
          alignSelf: "flex-start",
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          backgroundColor: ACCENT,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: radius.full
        },
        viewProfileText: { fontSize: 12, fontWeight: "700", color: "#fff" },
        dots: {
          flexDirection: "row",
          justifyContent: "center",
          gap: 6,
          marginTop: spacing.sm
        },
        dot: {
          width: 7,
          height: 7,
          borderRadius: 4,
          backgroundColor: colors.border
        },
        dotActive: { backgroundColor: ACCENT, width: 18 },
        gridTitleRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: spacing.sm
        },
        card: {
          width: cardWidth,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: "hidden",
          marginBottom: cardGap,
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: themeMode === "dark" ? 0.3 : 0.08,
          shadowRadius: 8,
          elevation: 3
        },
        cardPressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
        cardPhoto: {
          width: "100%",
          height: cardWidth * 0.95,
          backgroundColor: colors.surfaceElevated
        },
        verifiedBadge: {
          position: "absolute",
          top: 8,
          right: 8,
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: ACCENT,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 2,
          borderColor: "#fff"
        },
        cardBody: { padding: spacing.sm, gap: 3 },
        cardName: { fontSize: 14, fontWeight: "800", color: colors.text },
        cardPos: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
        catTag: {
          alignSelf: "flex-start",
          marginTop: 4,
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: radius.full
        },
        catTagText: { fontSize: 10, fontWeight: "700" },
        center: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: spacing.xl
        },
        errorText: { color: colors.error, textAlign: "center", marginBottom: spacing.md },
        empty: { alignItems: "center", paddingTop: 40, paddingHorizontal: spacing.xl },
        emptyIcon: {
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: themeMode === "dark" ? "#1E3A8A" : ACCENT_SOFT,
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
        columnWrap: { justifyContent: "space-between" }
      }),
    [bannerWidth, cardGap, cardWidth, colors, themeMode]
  );

  const listHeader = useMemo(() => {
    if (featured.length === 0) {
      return (
        <View style={s.gridTitleRow}>
          <Text style={s.sectionTitle}>Hall of Fame</Text>
        </View>
      );
    }
    return (
      <View>
        <View style={s.featuredWrap}>
          <Text style={s.sectionTitle}>Featured</Text>
          <ScrollView
            horizontal
            pagingEnabled={false}
            decelerationRate="fast"
            snapToInterval={bannerWidth + spacing.md}
            snapToAlignment="start"
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onFeaturedScroll}
            onScrollEndDrag={onFeaturedScroll}
          >
            {featured.map((person) => {
              const hero = getImageUrl(person.heroImageUrl || person.profileImageUrl);
              return (
                <Pressable
                  key={person.id}
                  style={s.banner}
                  onPress={() => openProfile(person.id)}
                >
                  {hero ? (
                    <Image source={{ uri: hero }} style={s.bannerImage} resizeMode="cover" />
                  ) : (
                    <View style={[s.bannerImage, { alignItems: "center", justifyContent: "center" }]}>
                      <AvatarImage
                        uri={person.profileImageUrl}
                        name={person.fullName}
                        size={64}
                        placeholderColor={ACCENT_SOFT}
                        textColor={ACCENT}
                      />
                    </View>
                  )}
                  <View style={s.bannerBody}>
                    <Text style={s.bannerName} numberOfLines={1}>
                      {person.fullName}
                    </Text>
                    {person.currentDesignation ? (
                      <Text style={s.bannerRole} numberOfLines={1}>
                        {person.currentDesignation}
                      </Text>
                    ) : null}
                    {person.shortDescription ? (
                      <Text style={s.bannerDesc} numberOfLines={2}>
                        {person.shortDescription}
                      </Text>
                    ) : null}
                    <Pressable
                      style={s.viewProfileBtn}
                      onPress={() => openProfile(person.id)}
                      hitSlop={4}
                    >
                      <Text style={s.viewProfileText}>View Profile</Text>
                      <Ionicons name="arrow-forward" size={14} color="#fff" />
                    </Pressable>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
          {featured.length > 1 ? (
            <View style={s.dots}>
              {featured.map((p, i) => (
                <View key={p.id} style={[s.dot, i === featuredIndex && s.dotActive]} />
              ))}
            </View>
          ) : null}
        </View>
        <View style={s.gridTitleRow}>
          <Text style={s.sectionTitle}>All people</Text>
        </View>
      </View>
    );
  }, [bannerWidth, featured, featuredIndex, onFeaturedScroll, openProfile, s]);

  const renderItem = useCallback(
    ({ item }: { item: ProminentPersonCard }) => {
      const photo = getImageUrl(item.profileImageUrl);
      const catColor = item.category?.color || ACCENT;
      return (
        <Pressable
          style={({ pressed }) => [s.card, pressed && s.cardPressed]}
          onPress={() => openProfile(item.id)}
        >
          <View>
            {photo ? (
              <Image source={{ uri: photo }} style={s.cardPhoto} resizeMode="cover" />
            ) : (
              <View style={[s.cardPhoto, { alignItems: "center", justifyContent: "center" }]}>
                <AvatarImage
                  uri={null}
                  name={item.fullName}
                  size={56}
                  placeholderColor={hexWithAlpha(catColor, "22", ACCENT_SOFT)}
                  textColor={catColor}
                />
              </View>
            )}
            {item.verified ? (
              <View style={s.verifiedBadge}>
                <Ionicons name="checkmark" size={14} color="#fff" />
              </View>
            ) : null}
          </View>
          <View style={s.cardBody}>
            <Text style={s.cardName} numberOfLines={1}>
              {item.fullName}
            </Text>
            <Text style={s.cardPos} numberOfLines={1}>
              {item.currentDesignation || item.occupation || "—"}
            </Text>
            {item.category ? (
              <View
                style={[
                  s.catTag,
                  { backgroundColor: hexWithAlpha(item.category.color, "22", ACCENT_SOFT) }
                ]}
              >
                <Text style={[s.catTagText, { color: item.category.color || ACCENT }]}>
                  {item.category.label}
                </Text>
              </View>
            ) : null}
          </View>
        </Pressable>
      );
    },
    [openProfile, s]
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
          <Text style={s.headerTitle}>Prominent People</Text>
          <Text style={s.headerSub}>Community Hall of Fame</Text>
        </View>
      </View>

      <View style={s.toolbar}>
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search by name, profession or category..."
            placeholderTextColor={colors.textMuted}
            value={searchDraft}
            onChangeText={setSearchDraft}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipScroll}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            style={[s.chip, categoryCode === "all" && s.chipActive]}
            onPress={() => setCategoryCode("all")}
          >
            <Text style={[s.chipText, categoryCode === "all" && s.chipTextActive]}>All</Text>
          </Pressable>
          {categories.map((cat) => {
            const active = categoryCode === cat.code;
            return (
              <Pressable
                key={cat.id}
                style={[
                  s.chip,
                  active && {
                    borderColor: cat.color || ACCENT,
                    backgroundColor: hexWithAlpha(
                      cat.color,
                      themeMode === "dark" ? "40" : "22",
                      ACCENT_SOFT
                    )
                  }
                ]}
                onPress={() => setCategoryCode(cat.code)}
              >
                <Text
                  style={[
                    s.chipText,
                    active && { color: cat.color || ACCENT, fontWeight: "700" }
                  ]}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={s.sortRow}>
          <Text style={s.sortLabel}>Sort</Text>
          <View style={s.sortToggle}>
            {(
              [
                ["latest", "Latest"],
                ["alphabetical", "Alphabetical"]
              ] as const
            ).map(([id, label]) => {
              const active = sort === id;
              return (
                <Pressable
                  key={id}
                  style={[s.sortBtn, active && s.sortBtnActive]}
                  onPress={() => setSort(id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[s.sortText, active && s.sortTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {loading && items.length === 0 && featured.length === 0 ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : error && items.length === 0 && featured.length === 0 ? (
        <View style={s.center}>
          <Text style={s.errorText}>{error}</Text>
          <PrimaryButton
            title="Retry"
            onPress={() => {
              hasLoadedOnce.current = false;
              setLoading(true);
              void loadAll({ q: searchQ, category: categoryCode, sort }).finally(() =>
                setLoading(false)
              );
            }}
          />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={s.columnWrap}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          contentContainerStyle={s.listContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              colors={[ACCENT]}
              tintColor={ACCENT}
            />
          }
          onEndReached={() => void onEndReached()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color={ACCENT} />
            ) : null
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <Ionicons name="ribbon-outline" size={32} color={ACCENT} />
              </View>
              <Text style={s.emptyTitle}>No people found</Text>
              <Text style={s.emptyText}>
                Try another search or category to discover community leaders.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
