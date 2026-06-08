import React, { useEffect, useCallback, useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  ActivityIndicator
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Header,
  DismissibleWelcomeCard,
  PostCard,
  BottomTabBar,
  HighlightSection,
  WelcomeCardSkeleton,
  FeedPostSkeleton,
  hasHighlightsData
} from "../../components/home";
import { CommentSheet } from "../../components/feed/CommentSheet";
import { useTheme } from "../../theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useHome } from "../../hooks/useHome";
import { useAppResume } from "../../hooks/useAppResume";
import { useFeedInteractions } from "../../hooks/useFeedInteractions";
import { useFeedRealtime } from "../../hooks/useFeedRealtime";
import { getErrorStatus } from "../../api/client";
import { messages } from "../../theme/messages";
import { trackFeedAction } from "../../utils/feedAnalytics";
import { openMessagesInbox } from "../../navigation/openMessages";
import { useNotificationsOptional } from "../../context/NotificationContext";
import type { PostCardData } from "../../components/home/PostCard";
import type { TabId } from "../../components/home/BottomTabBar";
import { shouldShowWelcomeCard } from "../../session/welcomeSession";

const PADDING = 16;
const SECTION_MARGIN = 28;

/**
 * Home Screen – community feed, welcome card, quick actions, highlights, bottom tabs.
 * Data from useHome(); no inline API calls. Handles 401 → Login, 403 → PendingApproval.
 */
export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { signOut } = useAuth();
  const { colors } = useTheme();
  const notifCtx = useNotificationsOptional();
  const {
    state,
    refetchAll,
    loadMoreFeed,
    updatePost,
    retrySummary,
    retryFeed,
    retryHighlights
  } = useHome();

  const { toggleLike, addLike, toggleSave } = useFeedInteractions(updatePost);

  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [refreshing, setRefreshing] = useState(false);
  const [commentPost, setCommentPost] = useState<PostCardData | null>(null);
  const commentPostIdRef = useRef<string | null>(null);
  const listRef = useRef<FlatList>(null);

  commentPostIdRef.current = commentPost?.id ?? null;

  const handleCommentCountChange = useCallback(
    (count: number) => {
      const id = commentPostIdRef.current;
      if (id) updatePost(id, { commentCount: count });
    },
    [updatePost]
  );

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

  /** 401 → sign out (app returns to Landing); 403 → Approval Pending */
  const handleAuthError = useCallback(
    (err: unknown) => {
      const status = getErrorStatus(err);
      if (status === 401) {
        signOut().catch(() => {});
      } else if (status === 403) {
        navigation.replace("PendingApproval");
      }
    },
    [navigation, signOut]
  );

  useFocusEffect(
    useCallback(() => {
      retrySummary();
    }, [retrySummary])
  );

  useAppResume(() => {
    void refetchAll();
  });

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
    if (tab === "home" && activeTab === "home") {
      onRefresh();
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
      return;
    }
    setActiveTab(tab);
    if (tab === "profile") {
      navigation.navigate("Profile");
    }
    if (tab === "messages") {
      openMessagesInbox(navigation);
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

  const realtimeHandlers = useMemo(
    () => ({
      onLike: (p: { postId: number; likeCount: number }) => {
        updatePost(String(p.postId), { likeCount: p.likeCount });
      },
      onComment: (p: { postId: number; commentCount: number }) => {
        updatePost(String(p.postId), { commentCount: p.commentCount });
      }
    }),
    [updatePost]
  );
  useFeedRealtime(realtimeHandlers);

  const renderFeedItem = useCallback(
    ({ item }: { item: PostCardData }) => (
      <PostCard
        post={item}
        onPress={() => {
          trackFeedAction("post_open", Number(item.id));
          navigation.navigate("PostDetail", { postId: Number(item.id) });
        }}
        onViewDetails={() => navigation.navigate("PostDetail", { postId: Number(item.id) })}
        onDoubleTap={() => addLike(item.id, item)}
        onLikePress={() => toggleLike(item.id, item)}
        onCommentPress={() => {
          trackFeedAction("comment_sheet_open", Number(item.id));
          setCommentPost(item);
        }}
        onSavePress={() => toggleSave(item.id, item)}
        onSharePress={() => trackFeedAction("share", Number(item.id))}
      />
    ),
    [navigation, addLike, toggleLike, toggleSave]
  );

  const keyExtractor = useCallback((item: PostCardData) => item.id, []);

  const showWelcomeCard = Boolean(summary && shouldShowWelcomeCard());
  const showHighlights = hasHighlightsData(highlights);
  const hasScrollHeader =
    showWelcomeCard || showHighlights || (summaryLoading && !summary) || Boolean(summaryError);

  const s = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        headerWrap: { backgroundColor: colors.surface },
        feedList: { flex: 1, backgroundColor: colors.background },
        headerPad: { paddingHorizontal: PADDING },
        section: { marginBottom: SECTION_MARGIN },
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
        {/* Welcome card – skeleton or content; dismissible card owns margin to avoid empty gap */}
        {summaryLoading && !summary ? (
          <View style={[s.section, s.headerPad]}>
            <WelcomeCardSkeleton />
          </View>
        ) : summaryError ? (
          <View style={[s.section, s.headerPad]}>
            <View style={s.errorCard}>
              <Text style={s.errorText}>Could not load your info</Text>
              <Pressable style={s.retryBtn} onPress={retrySummary}>
                <Text style={s.retryBtnText}>Retry</Text>
              </Pressable>
            </View>
          </View>
        ) : showWelcomeCard && summary ? (
          <View style={s.headerPad}>
            <DismissibleWelcomeCard
              userName={summary.user.name}
              avatarUri={summary.user.profileImage}
            />
          </View>
        ) : null}

        {hasHighlightsData(highlights) ? (
          <View style={s.headerPad}>
          <HighlightSection
            highlights={highlights}
            loading={highlightsLoading}
            error={highlightsError}
            onRetry={retryHighlights}
          />
          </View>
        ) : null}
      </>
    ),
    [
      summary,
      summaryLoading,
      summaryError,
      showWelcomeCard,
      highlights,
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
          <FeedPostSkeleton />
          <FeedPostSkeleton />
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
          notificationCount={
            notifCtx?.counts.total ?? summary?.unreadNotificationsCount ?? 0
          }
          messageCount={summary?.unreadMessagesCount ?? 0}
          onNotificationPress={() => navigation.navigate("Notifications")}
          onMessagePress={() => openMessagesInbox(navigation)}
          onMenuPress={onMenuPress}
        />
      </View>

      {/* Single FlatList: header content + feed; pull-to-refresh + infinite scroll */}
      <FlatList
        ref={listRef}
        style={s.feedList}
        data={feedItems}
        renderItem={renderFeedItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={hasScrollHeader ? ListHeaderComponent : null}
        ListFooterComponent={ListFooterComponent}
        ListEmptyComponent={ListEmptyComponent}
        onEndReached={loadMoreFeed}
        onEndReachedThreshold={0.3}
        removeClippedSubviews
        maxToRenderPerBatch={8}
        windowSize={7}
        initialNumToRender={6}
        contentContainerStyle={{
          paddingTop: hasScrollHeader ? PADDING : 0,
          paddingBottom: insets.bottom + 72
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {commentPost ? (
        <CommentSheet
          visible
          postId={Number(commentPost.id)}
          postTitle={commentPost.title}
          onClose={() => setCommentPost(null)}
          onCommentCountChange={handleCommentCountChange}
        />
      ) : null}

      {/* Fixed bottom tab bar */}
      <View style={s.tabBarWrap}>
        <View style={[s.tabBarInner, { paddingBottom: Math.max(insets.bottom - 4, 4) }]}>
          <BottomTabBar
            activeTab={activeTab}
            onTabPress={onTabPress}
            messageCount={summary?.unreadMessagesCount ?? 0}
          />
        </View>
      </View>
    </View>
  );
}
