import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  LayoutAnimation,
  Platform
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeContext";
import { spacing } from "../../theme/spacing";
import {
  deleteAllNotifications,
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationCategory,
  type NotificationItem
} from "../../api/notifications.api";
import { navigateFromNotification } from "../../navigation/notificationNavigation";
import { useNotifications } from "../../context/NotificationContext";
import { NotificationActivityHeader } from "../../components/notifications/NotificationActivityHeader";
import { NotificationSummaryStrip } from "../../components/notifications/NotificationSummaryStrip";
import { NotificationFilterChips } from "../../components/notifications/NotificationFilterChips";
import { NotificationListItem } from "../../components/notifications/NotificationListItem";
import { NotificationSkeletonList } from "../../components/notifications/NotificationSkeletonList";
import { NotificationEmptyState } from "../../components/notifications/NotificationEmptyState";
import {
  buildActivitySummary,
  groupNotificationsByDate,
  type NotificationSection
} from "../../features/notifications/notificationPresentation";
import { maybePromptPushAfterMeaningfulUse } from "../../permissions";
import { appAlert } from "../../utils/appAlert";

const PAGE_SIZE = 25;

function animateListChange() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

export function NotificationCenterScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { counts, setCounts } = useNotifications();

  const [tab, setTab] = useState<NotificationCategory>("ALL");
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const loadGen = useRef(0);

  const tabCount = useCallback(
    (id: NotificationCategory) => {
      if (id === "ALL") return counts.total;
      if (id === "SOCIAL") return counts.social;
      if (id === "MATRIMONY") return counts.matrimony;
      if (id === "MESSAGES") return counts.messages;
      if (id === "COMMUNITY") return counts.community;
      return counts.system;
    },
    [counts]
  );

  const load = useCallback(
    async (pageNum = 1, append = false, category = tab) => {
      const gen = ++loadGen.current;
      if (append) setLoadingMore(true);
      else if (!refreshing) setLoading(true);
      try {
        const res = await getNotifications(pageNum, PAGE_SIZE, category);
        if (gen !== loadGen.current) return;
        setItems((prev) => (append ? [...prev, ...res.items] : res.items));
        setTotal(res.total);
        setPage(pageNum);
        setCounts(res.counts);
      } catch {
        if (gen === loadGen.current && !append) setItems([]);
      } finally {
        if (gen === loadGen.current) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [refreshing, setCounts, tab]
  );

  useFocusEffect(
    useCallback(() => {
      void load(1, false, tab);
    }, [load, tab])
  );

  useFocusEffect(
    useCallback(() => {
      // After the user opens notifications (meaningful use), offer push once —
      // never on cold start / login bootstrap.
      let cancelled = false;
      const t = setTimeout(() => {
        if (!cancelled) void maybePromptPushAfterMeaningfulUse();
      }, 1200);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }, [])
  );

  const onTab = (id: NotificationCategory) => {
    if (id === tab) return;
    setTab(id);
    void load(1, false, id);
  };

  const markItemReadLocal = useCallback((id: number) => {
    animateListChange();
    setItems((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
      )
    );
  }, []);

  const removeItemLocal = useCallback((id: number) => {
    animateListChange();
    setItems((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const onOpen = useCallback(
    async (item: NotificationItem) => {
      if (!item.isRead) {
        try {
          const c = await markNotificationRead(item.id);
          setCounts(c);
          markItemReadLocal(item.id);
        } catch {
          /* continue navigation */
        }
      }
      navigateFromNotification(navigation, item);
    },
    [markItemReadLocal, navigation, setCounts]
  );

  const onMarkRead = useCallback(
    async (item: NotificationItem) => {
      if (item.isRead) return;
      try {
        const c = await markNotificationRead(item.id);
        setCounts(c);
        markItemReadLocal(item.id);
      } catch {
        /* */
      }
    },
    [markItemReadLocal, setCounts]
  );

  const onDelete = useCallback(
    async (id: number) => {
      try {
        const c = await deleteNotification(id);
        setCounts(c);
        removeItemLocal(id);
      } catch {
        /* */
      }
    },
    [removeItemLocal, setCounts]
  );

  const onMarkAll = useCallback(async () => {
    try {
      const c = await markAllNotificationsRead(tab);
      setCounts(c);
      animateListChange();
      setItems((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: n.readAt ?? new Date().toISOString() }))
      );
    } catch {
      /* */
    }
  }, [setCounts, tab]);

  const onClearAll = useCallback(() => {
    if (items.length === 0 && total === 0) return;
    const scope = tab === "ALL" ? "all notifications" : `${tab.toLowerCase()} notifications`;
    appAlert("Clear all?", `This will delete ${scope} from your list.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear all",
        style: "destructive",
        onPress: () =>
          void (async () => {
            try {
              const c = await deleteAllNotifications(tab);
              setCounts(c);
              animateListChange();
              setItems([]);
              setTotal(0);
            } catch {
              appAlert("Couldn't clear", "Please try again.");
            }
          })()
      }
    ]);
  }, [items.length, setCounts, tab, total]);

  const sections = useMemo(() => groupNotificationsByDate(items), [items]);
  const summaryLines = useMemo(
    () => (tab === "ALL" ? buildActivitySummary(counts) : []),
    [counts, tab]
  );
  const hasMore = items.length < total;
  const hasUnread = items.some((n) => !n.isRead);

  const renderItem = useCallback(
    ({ item }: { item: NotificationItem }) => (
      <NotificationListItem
        item={item}
        onPress={() => onOpen(item)}
        onMarkRead={() => onMarkRead(item)}
        onDelete={() => onDelete(item.id)}
      />
    ),
    [onDelete, onMarkRead, onOpen]
  );

  const keyExtractor = useCallback((item: NotificationItem) => String(item.id), []);

  const s = useMemo(
    () =>
      StyleSheet.create({
        fill: { flex: 1, backgroundColor: colors.background },
        sectionHeader: {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.sm
        },
        sectionTitle: {
          fontSize: 13,
          fontWeight: "800",
          letterSpacing: 0.4,
          color: colors.textMuted,
          textTransform: "uppercase"
        },
        footer: { paddingVertical: spacing.lg, alignItems: "center" }
      }),
    [colors]
  );

  const listHeader = useMemo(
    () => (
      <>
        {summaryLines.length > 0 ? (
          <NotificationSummaryStrip
            lines={summaryLines}
            onSelectCategory={(cat) => onTab(cat)}
          />
        ) : null}
        <NotificationFilterChips active={tab} countFor={tabCount} onChange={onTab} />
      </>
    ),
    [onTab, summaryLines, tab, tabCount]
  );

  return (
    <View style={[s.fill, { paddingTop: insets.top }]}>
      <NotificationActivityHeader
        unreadTotal={counts.total}
        onBack={() => navigation.goBack()}
        onMarkAllRead={() => void onMarkAll()}
        onClearAll={onClearAll}
        onSettings={() => navigation.navigate("Settings")}
        canMarkAll={hasUnread}
        canClearAll={items.length > 0 || total > 0}
      />

      {loading && items.length === 0 ? (
        <NotificationSkeletonList />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          renderSectionHeader={({ section }: { section: NotificationSection }) => (
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{section.title}</Text>
            </View>
          )}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={<NotificationEmptyState category={tab} />}
          stickySectionHeadersEnabled={false}
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={9}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={Platform.OS === "android"}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={colors.primary}
              onRefresh={() => {
                setRefreshing(true);
                void load(1, false);
              }}
            />
          }
          onEndReached={() => {
            if (!loadingMore && hasMore) void load(page + 1, true);
          }}
          onEndReachedThreshold={0.35}
          ListFooterComponent={
            loadingMore ? (
              <View style={s.footer}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <View style={{ height: insets.bottom + spacing.xxl }} />
            )
          }
        />
      )}
    </View>
  );
}
