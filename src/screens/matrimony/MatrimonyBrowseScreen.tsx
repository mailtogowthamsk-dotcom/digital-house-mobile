import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Pressable
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  discoverMatrimonyProfiles,
  getMatrimonyHub,
  type DiscoverCard,
  type MatrimonySubscriptionSummary
} from "../../api/matrimony.api";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../theme/ThemeContext";
import { spacing } from "../../theme/spacing";
import {
  MatrimonyBrowseFilters,
  emptyBrowseFilters,
  hasActiveFilters,
  toDiscoverParams,
  type BrowseFilterState
} from "../../components/matrimony/MatrimonyBrowseFilters";
import { MatrimonyScreenHeader } from "../../components/matrimony/MatrimonyScreenHeader";
import { MatrimonyMatchCard } from "../../components/matrimony/MatrimonyMatchCard";
import { MatrimonyQuickFilterBar } from "../../components/matrimony/MatrimonyQuickFilterBar";
import { buildDiscoverChips, type QuickBrowseFilter } from "../../components/matrimony/matrimonyUi";
import { MatrimonyBrowseGate } from "../../components/matrimony/MatrimonyBrowseGate";

const PAGE_SIZE = 20;

export function MatrimonyBrowseScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [items, setItems] = useState<DiscoverCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<BrowseFilterState>(emptyBrowseFilters());
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [quickFilter, setQuickFilter] = useState<QuickBrowseFilter>("all");
  const [viewerDistrict, setViewerDistrict] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<MatrimonySubscriptionSummary | null>(null);
  const [emptyHint, setEmptyHint] = useState<string | null>(null);

  const hasMore = items.length < total;

  const mergeQuickFilter = useCallback(
    (base: BrowseFilterState, quick: QuickBrowseFilter): BrowseFilterState => {
      if (quick === "horoscope") return { ...base, horoscopeOnly: true };
      if (quick === "myDistrict" && viewerDistrict) return { ...base, district: viewerDistrict };
      return base;
    },
    [viewerDistrict]
  );

  const effectiveFilters = useCallback(
    (base?: BrowseFilterState, quick?: QuickBrowseFilter) => {
      const b = base ?? filters;
      return mergeQuickFilter(b, quick ?? quickFilter);
    },
    [filters, quickFilter, mergeQuickFilter]
  );

  const load = useCallback(
    async (pageNum = 1, append = false, filterState?: BrowseFilterState) => {
      const active = effectiveFilters(filterState);
      if (append) setLoadingMore(true);
      else {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await discoverMatrimonyProfiles(toDiscoverParams(active, pageNum, PAGE_SIZE));
        setItems((prev) => (append ? [...prev, ...res.items] : res.items));
        setTotal(res.total);
        setPage(res.page);
        setEmptyHint(res.emptyHint ?? null);
      } catch (e) {
        if (!append) {
          setError(e instanceof Error ? e.message : "Failed to load");
          setItems([]);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [effectiveFilters]
  );

  useFocusEffect(
    useCallback(() => {
      getMatrimonyHub()
        .then((h) => {
          setViewerDistrict(h.user_context?.district ?? null);
          setSubscription(h.subscription ?? null);
        })
        .catch(() => {
          setViewerDistrict(null);
          setSubscription(null);
        });
      void load(1, false);
    }, [load])
  );

  const onQuickFilter = (q: QuickBrowseFilter) => {
    setQuickFilter(q);
    void load(1, false, effectiveFilters(filters, q));
  };

  const onApplyFilters = (next: BrowseFilterState) => {
    setFilters(next);
    setQuickFilter("all");
    setFiltersVisible(false);
    void load(1, false, next);
  };

  const onClearFilters = () => {
    const cleared = emptyBrowseFilters();
    setFilters(cleared);
    setQuickFilter("all");
    setFiltersVisible(false);
    void load(1, false, cleared);
  };

  const sheetFiltersActive = hasActiveFilters(filters);
  const activeFilters = sheetFiltersActive || quickFilter !== "all";

  return (
    <MatrimonyBrowseGate>
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <MatrimonyScreenHeader
        title="Browse profiles"
        onBack={() => navigation.goBack()}
        rightLabel="Interests"
        onRightPress={() => navigation.navigate("MatrimonyInterests")}
      />

      <MatrimonyQuickFilterBar
        active={quickFilter}
        onChange={onQuickFilter}
        onOpenFilters={() => setFiltersVisible(true)}
        filtersActive={sheetFiltersActive}
      />

      {subscription && subscription.plan !== "FREE" && subscription.quota.limit > 0 ? (
        <View style={[styles.quotaBar, { backgroundColor: "#EFF6FF", borderColor: "#DBEAFE" }]}>
          <Text style={{ color: "#1D4ED8", fontSize: 12, fontWeight: "600" }}>
            Profile opens: {subscription.quota.used} of {subscription.quota.limit} used
          </Text>
          <Text style={{ color: "#1D4ED8", fontSize: 11 }}>
            Resets {new Date(subscription.quota.resetsAt).toLocaleDateString()}
          </Text>
        </View>
      ) : null}

      {subscription?.plan === "FREE" ? (
        <Pressable
          onPress={() => navigation.navigate("MatrimonyPlans")}
          style={{ marginHorizontal: spacing.lg, marginBottom: spacing.sm }}
        >
          <LinearGradient
            colors={["#EFF6FF", "#FEF3C7"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.upgradeStrip}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "800", fontSize: 13, color: colors.text }}>Unlock full profiles</Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                Photos, horoscope & details · from ₹699
              </Text>
            </View>
            <Text style={{ fontWeight: "800", color: "#D97706", fontSize: 12 }}>Upgrade</Text>
          </LinearGradient>
        </Pressable>
      ) : null}

      <Text style={[styles.sub, { color: colors.textSecondary }]}>
        {activeFilters ? "Filters active · " : ""}
        {total > 0
          ? `${total} profile${total === 1 ? "" : "s"}`
          : "Verified candidates · same kulam excluded"}
      </Text>

      {loading && !items.length ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : error ? (
        <Text style={{ color: colors.error, textAlign: "center", marginTop: 24, paddingHorizontal: 24 }}>
          {error}
        </Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i, index) => `browse-${i.userId}-${index}`}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl }}
          refreshControl={
            <RefreshControl refreshing={loading && !loadingMore} onRefresh={() => load(1, false)} />
          }
          onEndReached={() => {
            if (!loadingMore && hasMore && !loading) void load(page + 1, true);
          }}
          onEndReachedThreshold={0.35}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", color: colors.textSecondary, marginTop: 32, lineHeight: 22, paddingHorizontal: spacing.lg }}>
              {emptyHint ??
                "No profiles match your filters. Tap All, or update partner age, gender, and districts in Matrimony setup."}
            </Text>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} />
            ) : hasMore && items.length > 0 ? (
              <Text style={{ textAlign: "center", color: colors.textMuted, marginVertical: 12, fontSize: 12 }}>
                Scroll for more
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <MatrimonyMatchCard
              item={item}
              chips={buildDiscoverChips(item, viewerDistrict)}
              onPress={() => navigation.navigate("MatrimonyCandidate", { userId: item.userId })}
            />
          )}
        />
      )}

      <MatrimonyBrowseFilters
        visible={filtersVisible}
        initial={filters}
        onClose={() => setFiltersVisible(false)}
        onApply={onApplyFilters}
        onClear={onClearFilters}
      />
    </View>
    </MatrimonyBrowseGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sub: { fontSize: 12, marginBottom: spacing.sm, paddingHorizontal: spacing.lg },
  quotaBar: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  upgradeStrip: {
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  }
});
