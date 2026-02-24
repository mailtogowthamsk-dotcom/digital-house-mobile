import React, { useEffect, useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  ActivityIndicator
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Header,
  WelcomeCard,
  PostCard,
  BottomTabBar,
  HighlightSection,
  WelcomeCardSkeleton,
  SkeletonCard
} from "../../components/home";
import { useTheme } from "../../theme/ThemeContext";
import { useHome } from "../../hooks/useHome";
import { getErrorStatus } from "../../api/client";
import { messages } from "../../theme/messages";
import type { PostCardData } from "../../components/home/PostCard";
import type { TabId } from "../../components/home/BottomTabBar";

const PADDING = 16;
const SECTION_MARGIN = 28;
const SECTION_TITLE_MARGIN = 12;

/**
 * Home Screen – community feed, welcome card, quick actions, highlights, bottom tabs.
 * Data from useHome(); no inline API calls. Handles 401 → Login, 403 → PendingApproval.
 */
export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const {
    state,
    refetchAll,
    loadMoreFeed,
    retrySummary,
    retryFeed,
    retryHighlights
  } = useHome();

  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [refreshing, setRefreshing] = useState(false);

  const {
    summary,
    summaryLoading,
    summaryError,
    feedItems,
    feedTotal,
    feedLoading,
    feedLoadingMore,
    feedError,
    highlights,
    highlightsLoading,
    highlightsError
  } = state;

  /** 401 → clear token and go to Login; 403 → Approval Pending */
  const handleAuthError = useCallback(
    (err: unknown) => {
      const status = getErrorStatus(err);
      if (status === 401) {
        navigation.replace("Login");
      } else if (status === 403) {
        navigation.replace("PendingApproval");
      }
    },
    [navigation]
  );

  useEffect(() => {
    if (summaryError) handleAuthError(summaryError);
  }, [summaryError, handleAuthError]);

  useEffect(() => {
    if (feedError) handleAuthError(feedError);
  }, [feedError, handleAuthError]);

  const onTabPress = (tab: TabId) => {
    if (tab === "create") {
      navigation.navigate("CreatePost");
      return;
    }
    setActiveTab(tab);
    if (tab === "profile") {
      navigation.navigate("Profile");
    }
  };

  const onMenuPress = () => {
    navigation.navigate("Menu", {
      messageCount: summary?.unreadMessagesCount ?? 0
    });
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchAll();
    setRefreshing(false);
  }, [refetchAll]);

  const renderFeedItem = useCallback(
    ({ item }: { item: PostCardData }) => (
      <PostCard
        post={item}
        onViewDetails={() => navigation.navigate("PostDetail", { postId: Number(item.id) })}
      />
    ),
    [navigation]
  );

  const keyExtractor = useCallback((item: PostCardData) => item.id, []);

  const s = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        headerWrap: { backgroundColor: colors.surface },
        listContent: { paddingHorizontal: PADDING, paddingTop: PADDING + 4 },
        section: { marginBottom: SECTION_MARGIN },
        sectionTitle: { fontSize: 17, fontWeight: "600", color: colors.text },
        sectionTitleGap: { height: SECTION_TITLE_MARGIN },
        feedHeader: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: SECTION_TITLE_MARGIN
        },
        feedTitle: { fontSize: 17, fontWeight: "600", color: colors.text },
        feedMoreBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
        feedMoreText: { fontSize: 14, fontWeight: "600", color: colors.primary },
        feedSkeleton: { marginBottom: 14 },
        feedSkeletonCard: { borderRadius: 16, marginBottom: 14 },
        footerLoader: { paddingVertical: 16, alignItems: "center" },
        errorCard: {
          paddingVertical: 24,
          paddingHorizontal: PADDING,
          alignItems: "center",
          backgroundColor: colors.surface,
          borderRadius: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 2,
          gap: 12
        },
        errorText: { fontSize: 14, color: colors.textSecondary },
        retryBtn: {
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: colors.primary,
          borderRadius: 10
        },
        retryBtnText: { fontSize: 14, fontWeight: "600", color: colors.white },
        emptyFeed: {
          paddingVertical: 40,
          paddingHorizontal: PADDING,
          alignItems: "center",
          backgroundColor: colors.surface,
          borderRadius: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 2
        },
        emptyIconWrap: {
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: colors.surfaceElevated,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16
        },
        emptyTitle: {
          fontSize: 17,
          fontWeight: "600",
          color: colors.text,
          marginBottom: 8
        },
        emptySubtitle: {
          fontSize: 14,
          color: colors.textSecondary,
          textAlign: "center",
          lineHeight: 22
        },
        tabBarWrap: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.surface
        },
        tabBarInner: { backgroundColor: colors.surface }
      }),
    [colors]
  );

  const ListHeaderComponent = useCallback(
    () => (
      <>
        {/* Welcome card – skeleton or content */}
        <View style={s.section}>
          {summaryLoading && !summary ? (
            <WelcomeCardSkeleton />
          ) : summaryError ? (
            <View style={s.errorCard}>
              <Text style={s.errorText}>Could not load your info</Text>
              <Pressable style={s.retryBtn} onPress={retrySummary}>
                <Text style={s.retryBtnText}>Retry</Text>
              </Pressable>
            </View>
          ) : summary ? (
            <WelcomeCard
              userName={summary.user.name}
              avatarUri={summary.user.profileImage}
            />
          ) : null}
        </View>

        {/* Highlights */}
        <View style={s.section}>
          <HighlightSection
            highlights={highlights}
            loading={highlightsLoading}
            error={highlightsError}
            onRetry={retryHighlights}
          />
        </View>

        {/* Feed section header */}
        <View style={s.feedHeader}>
          <Text style={s.feedTitle}>Community Feed</Text>
          <Pressable style={s.feedMoreBtn} hitSlop={12} onPress={() => {}}>
            <Text style={s.feedMoreText}>See all</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </Pressable>
        </View>
      </>
    ),
    [
      summary,
      summaryLoading,
      summaryError,
      highlights,
      highlightsLoading,
      highlightsError,
      retrySummary,
      retryHighlights,
      s,
      colors
    ]
  );

  const ListFooterComponent = useCallback(() => {
    if (feedLoadingMore) {
      return (
        <View style={s.footerLoader}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      );
    }
    return null;
  }, [feedLoadingMore, s, colors.primary]);

  const ListEmptyComponent = useCallback(() => {
    if (feedLoading) {
      return (
        <View style={s.feedSkeleton}>
          <SkeletonCard height={180} style={s.feedSkeletonCard} />
          <SkeletonCard height={180} style={s.feedSkeletonCard} />
        </View>
      );
    }
    if (feedError) {
      return (
        <View style={s.errorCard}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.textSecondary} />
          <Text style={s.errorText}>Could not load feed</Text>
          <Pressable style={s.retryBtn} onPress={retryFeed}>
            <Text style={s.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={s.emptyFeed}>
        <View style={s.emptyIconWrap}>
          <Ionicons name="newspaper-outline" size={40} color={colors.textSecondary} />
        </View>
        <Text style={s.emptyTitle}>No posts yet</Text>
        <Text style={s.emptySubtitle}>{messages.empty.feed}</Text>
      </View>
    );
  }, [feedLoading, feedError, retryFeed, messages.empty.feed, s, colors]);

  return (
    <View style={s.container}>
      {/* Fixed header – user summary (notification/message counts) */}
      <View style={[s.headerWrap, { paddingTop: insets.top }]}>
        <Header
          notificationCount={summary?.unreadNotificationsCount ?? 0}
          messageCount={summary?.unreadMessagesCount ?? 0}
          onNotificationPress={() => {}}
          onMessagePress={() => {}}
          onMenuPress={onMenuPress}
        />
      </View>

      {/* Single FlatList: header content + feed; pull-to-refresh + infinite scroll */}
      <FlatList
        data={feedItems}
        renderItem={renderFeedItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
        ListEmptyComponent={ListEmptyComponent}
        onEndReached={loadMoreFeed}
        onEndReachedThreshold={0.3}
        contentContainerStyle={[
          s.listContent,
          { paddingBottom: insets.bottom + 100 }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {/* Fixed bottom tab bar */}
      <View style={s.tabBarWrap}>
        <View style={[s.tabBarInner, { paddingBottom: insets.bottom }]}>
          <BottomTabBar activeTab={activeTab} onTabPress={onTabPress} />
        </View>
      </View>
    </View>
  );
}
