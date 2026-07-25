import React, { useCallback, useEffect, useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated
} from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import {
  Header,
  FLOATING_HEADER_HEIGHT,
  FLOATING_TAB_BAR_HEIGHT,
  DismissibleWelcomeCard,
  PostCard,
  BottomTabBar,
  HighlightSection,
  FeedPostSkeleton,
  hasHighlightsData
} from "../../components/home";
import { CommentSheet } from "../../components/feed/CommentSheet";
import { LikesBottomSheet } from "../../components/likes/LikesBottomSheet";
import {
  PostActionsBottomSheet,
  type PostSharePayload
} from "../../components/share/PostActionsBottomSheet";
import type { PostLiker } from "../../api/posts.api";
import { useTheme } from "../../theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useHome } from "../../hooks/useHome";
import { useWelcomeCardVisible } from "../../hooks/useWelcomeCardVisible";
import { useAppResume } from "../../hooks/useAppResume";
import { pauseAllFeedVideos } from "../../media/feedVideoPlayback";
import { pickActiveAndPreloadVideoIds } from "../../utils/feedVideoVisibility";
import { useFeedInteractions } from "../../hooks/useFeedInteractions";
import { useFeedRealtime } from "../../hooks/useFeedRealtime";
import { useNavigateToPostAuthor } from "../../hooks/useNavigateToPostAuthor";
import { PlatformBannerStrip, PlatformAnnouncementCard, PlatformHomeAd } from "../../components/platform/PlatformGateOverlay";
import { getErrorStatus, isSessionInvalid401 } from "../../api/client";
import { messages } from "../../theme/messages";
import { trackFeedAction } from "../../utils/feedAnalytics";
import { emitPostUpdated } from "../../utils/postSync";
import { openMessagesInbox } from "../../navigation/openMessages";
import { handleMainTabPress } from "../../navigation/mainTabs";
import type { RootStackParamList } from "../../navigation/types";
import { useNotificationsOptional } from "../../context/NotificationContext";
import type { PostCardData } from "../../components/home/PostCard";
import type { TabId } from "../../components/home/BottomTabBar";
import { ExploreScreen } from "../explore/ExploreScreen";

const PADDING = 16;
const SECTION_MARGIN = 28;
const HEADER_HIDE_DELTA = 8;

/**
 * Home Screen – community feed, welcome card, quick actions, highlights, bottom tabs.
 * Data from useHome(); no inline API calls. Handles 401 → Login, 403 → PendingApproval.
 */
export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, "Home">>();
  const { signOut, user: authUser } = useAuth();
  const { colors, mode } = useTheme();
  const notifCtx = useNotificationsOptional();
  const welcomeCardVisible = useWelcomeCardVisible();
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
  const navigateToPostAuthor = useNavigateToPostAuthor();

  const [activeTab, setActiveTab] = useState<TabId>(
    route.params?.tab === "explore" ? "explore" : "home"
  );
  const [refreshing, setRefreshing] = useState(false);
  const [commentPost, setCommentPost] = useState<PostCardData | null>(null);
  const [likesPost, setLikesPost] = useState<PostCardData | null>(null);
  const [sharePost, setSharePost] = useState<PostSharePayload | null>(null);
  const commentPostIdRef = useRef<string | null>(null);
  const listRef = useRef<FlatList<PostCardData>>(null);
  const focusRefreshRef = useRef(false);
  const headerHideProgress = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const headerHiddenRef = useRef(false);
  const retrySummaryRef = useRef(retrySummary);
  retrySummaryRef.current = retrySummary;
  const [activeMediaPostId, setActiveMediaPostId] = useState<string | null>(null);
  const [preloadMediaPostId, setPreloadMediaPostId] = useState<string | null>(null);
  const feedItemsRef = useRef<PostCardData[]>([]);
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 65,
    minimumViewTime: 120
  }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item: PostCardData; isViewable: boolean }> }) => {
      const { activeId, preloadId } = pickActiveAndPreloadVideoIds(
        viewableItems,
        feedItemsRef.current
      );
      setActiveMediaPostId(activeId);
      setPreloadMediaPostId(preloadId);
    }
  ).current;

  commentPostIdRef.current = commentPost?.id ?? null;

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

  feedItemsRef.current = feedItems;

  const welcomeUser = useMemo(
    () =>
      summary?.user ??
      (authUser
        ? { name: authUser.fullName, profileImage: authUser.profilePhoto ?? null }
        : null),
    [summary?.user, authUser?.fullName, authUser?.profilePhoto]
  );

  const showWelcomeCard = Boolean(welcomeCardVisible && welcomeUser);
  const showSummaryError = Boolean(summaryError && !summary);
  const showHighlights = hasHighlightsData(highlights);
  const showHighlightsSection = showHighlights || highlightsLoading || Boolean(highlightsError);
  const hasScrollHeader =
    showWelcomeCard ||
    showHighlightsSection ||
    showSummaryError ||
    (summaryLoading && !summary && !welcomeCardVisible);

  /** 401 → sign out (app returns to Landing); 403 → Approval Pending */
  const handleAuthError = useCallback(
    (err: unknown) => {
      const status = getErrorStatus(err);
      if (status === 401 && isSessionInvalid401(err)) {
        signOut().catch(() => {});
      } else if (status === 403) {
        navigation.replace("PendingApproval");
      }
    },
    [navigation, signOut]
  );

  useFocusEffect(
    useCallback(() => {
      const tab = route.params?.tab;
      if (tab === "explore" || tab === "home") {
        setActiveTab(tab);
      }
      if (focusRefreshRef.current) {
        void retrySummaryRef.current();
      } else {
        focusRefreshRef.current = true;
      }
      return () => {
        setActiveMediaPostId(null);
        setPreloadMediaPostId(null);
        pauseAllFeedVideos();
      };
    }, [route.params?.tab])
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchAll();
    setRefreshing(false);
  }, [refetchAll]);

  const onTabPress = (tab: TabId) => {
    if (tab === "create") {
      navigation.navigate("CreatePost");
      return;
    }
    if (tab === "home" && activeTab === "home") {
      void onRefresh();
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
      return;
    }
    if (tab === "home" || tab === "explore") {
      if (tab !== activeTab) {
        setActiveMediaPostId(null);
        setPreloadMediaPostId(null);
        pauseAllFeedVideos();
      }
      setActiveTab(tab);
      return;
    }
    if (tab !== activeTab) {
      setActiveMediaPostId(null);
      setPreloadMediaPostId(null);
      pauseAllFeedVideos();
    }
    handleMainTabPress(navigation, activeTab, tab);
  };

  const onMenuPress = () => {
    navigation.navigate("Menu", {
      messageCount: summary?.unreadMessagesCount ?? 0
    });
  };
  const onFeedScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const dy = y - lastScrollY.current;
      lastScrollY.current = y;
      if (y <= 12) {
        if (headerHiddenRef.current) {
          headerHiddenRef.current = false;
          Animated.timing(headerHideProgress, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true
          }).start();
        }
        return;
      }
      if (dy > HEADER_HIDE_DELTA && !headerHiddenRef.current) {
        headerHiddenRef.current = true;
        Animated.timing(headerHideProgress, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true
        }).start();
      } else if (dy < -HEADER_HIDE_DELTA && headerHiddenRef.current) {
        headerHiddenRef.current = false;
        Animated.timing(headerHideProgress, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true
        }).start();
      }
    },
    [headerHideProgress]
  );

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

  const handleAuthorPress = useCallback(
    (item: PostCardData) => {
      if (!item.authorUserId && !item.authorUsername) return;
      trackFeedAction("author_profile_open", Number(item.id));
      navigateToPostAuthor(item.authorUserId, item.authorUsername);
    },
    [navigateToPostAuthor]
  );

  const renderFeedItem = useCallback(
    ({ item }: { item: PostCardData }) => (
      <PostCard
        post={{
          ...item,
          isMediaActive: item.id === activeMediaPostId,
          isMediaPreload: item.id === preloadMediaPostId
        }}
        onAuthorPress={() => handleAuthorPress(item)}
        onPress={() => {
          trackFeedAction("post_open", Number(item.id));
          navigation.navigate("PostDetail", { postId: Number(item.id) });
        }}
        onViewDetails={() => navigation.navigate("PostDetail", { postId: Number(item.id) })}
        onDoubleTap={() => addLike(item.id, item)}
        onLikePress={() => toggleLike(item.id, item)}
        onLikeCountPress={() => {
          trackFeedAction("likes_sheet_open", Number(item.id));
          setLikesPost(item);
        }}
        onCommentPress={() => {
          trackFeedAction("comment_sheet_open", Number(item.id));
          setCommentPost(item);
        }}
        onSavePress={() => toggleSave(item.id, item)}
        onSharePress={() => {
          trackFeedAction("share", Number(item.id));
          setSharePost({
            postId: Number(item.id),
            title: item.title,
            authorName: item.userName,
            mediaUrl: item.imageUri,
            mediaType: item.mediaType,
            thumbnailUrl: item.thumbnailUrl
          });
        }}
      />
    ),
    [navigation, addLike, toggleLike, toggleSave, activeMediaPostId, preloadMediaPostId, handleAuthorPress]
  );

  const keyExtractor = useCallback((item: PostCardData) => item.id, []);

  const handleCommentCountChange = useCallback(
    (count: number) => {
      const id = commentPostIdRef.current;
      if (id) {
        updatePost(id, { commentCount: count });
        emitPostUpdated(Number(id), { commentCount: count });
      }
    },
    [updatePost]
  );

  const handleLikerPress = useCallback(
    (liker: PostLiker) => {
      setLikesPost(null);
      if (liker.isCurrentUser) {
        navigation.navigate("Profile");
        return;
      }
      navigation.navigate("MemberProfile", { userId: liker.userId });
    },
    [navigation]
  );

  const onHighlightPress = useCallback(
    (item: { postId: number }) => {
      trackFeedAction("post_open", item.postId, { source: "highlight" });
      navigation.navigate("PostDetail", { postId: item.postId });
    },
    [navigation]
  );

  const listTopPad = insets.top + FLOATING_HEADER_HEIGHT + 8;
  const listBottomPad = Math.max(insets.bottom, 8) + FLOATING_TAB_BAR_HEIGHT + 16;

  const s = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        feedBackdrop: {
          ...StyleSheet.absoluteFillObject
        },
        feedList: { flex: 1, backgroundColor: "transparent" },
        headerPad: { paddingHorizontal: PADDING },
        section: { marginBottom: SECTION_MARGIN },
        feedSkeleton: { marginBottom: 0 },
        footerLoader: {
          paddingVertical: 20,
          alignItems: "center",
          gap: 10
        },
        endOfFeed: {
          paddingVertical: 28,
          alignItems: "center"
        },
        endOfFeedText: { fontSize: 13, fontWeight: "500", color: colors.textSecondary },
        errorCard: {
          marginHorizontal: 8,
          paddingVertical: 28,
          paddingHorizontal: PADDING,
          alignItems: "center",
          backgroundColor: colors.surface,
          borderRadius: 22,
          gap: 12
        },
        errorText: { fontSize: 14, color: colors.textSecondary },
        retryBtn: {
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: colors.primary,
          borderRadius: 12
        },
        retryBtnText: { fontSize: 14, fontWeight: "600", color: colors.white },
        emptyFeed: {
          marginHorizontal: 8,
          paddingVertical: 48,
          paddingHorizontal: PADDING,
          alignItems: "center",
          backgroundColor: colors.surface,
          borderRadius: 22
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
        }
      }),
    [colors]
  );

  const feedBackdropColors = useMemo(
    () =>
      mode === "dark"
        ? (["#14532D", "#0B1220", "#7F1D1D"] as const)
        : (["#166534", "#FFFFFF", "#991B1B"] as const),
    [mode]
  );

  const ListHeaderComponent = useCallback(
    () => (
      <>
        {showSummaryError ? (
          <View style={[s.section, s.headerPad]}>
            <View style={s.errorCard}>
              <Text style={s.errorText}>Could not load your info</Text>
              <Pressable style={s.retryBtn} onPress={() => void retrySummary()}>
                <Text style={s.retryBtnText}>Retry</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {showWelcomeCard && welcomeUser ? (
          <View style={s.headerPad}>
            <DismissibleWelcomeCard
              userName={welcomeUser.name}
              avatarUri={welcomeUser.profileImage}
            />
          </View>
        ) : null}

        {showHighlightsSection ? (
          <View style={s.headerPad}>
            <HighlightSection
              highlights={highlights}
              loading={highlightsLoading}
              error={highlightsError}
              onRetry={retryHighlights}
              onItemPress={onHighlightPress}
            />
          </View>
        ) : null}
      </>
    ),
    [
      welcomeUser,
      showSummaryError,
      showWelcomeCard,
      showHighlightsSection,
      highlights,
      highlightsLoading,
      highlightsError,
      retrySummary,
      retryHighlights,
      onHighlightPress,
      s
    ]
  );

  const ListFooterComponent = useCallback(() => {
    if (feedLoadingMore) {
      return (
        <View style={s.footerLoader}>
          <FeedPostSkeleton />
        </View>
      );
    }
    if (
      !feedLoading &&
      !feedError &&
      feedItems.length > 0 &&
      feedTotal > 0 &&
      feedItems.length >= feedTotal
    ) {
      return (
        <View style={s.endOfFeed}>
          <Text style={s.endOfFeedText}>You're all caught up</Text>
        </View>
      );
    }
    return null;
  }, [feedLoadingMore, feedLoading, feedError, feedItems.length, feedTotal, s]);

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
      <LinearGradient
        colors={[...feedBackdropColors]}
        locations={[0, 0.48, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={s.feedBackdrop}
        pointerEvents="none"
      />

      <Header
        notificationCount={notifCtx?.counts.total ?? summary?.unreadNotificationsCount ?? 0}
        messageCount={summary?.unreadMessagesCount ?? 0}
        onNotificationPress={() => navigation.navigate("Notifications")}
        onMessagePress={() => openMessagesInbox(navigation)}
        onMenuPress={onMenuPress}
        hideProgress={headerHideProgress}
        topInset={insets.top}
      />

      <PlatformBannerStrip />
      <PlatformAnnouncementCard />
      <PlatformHomeAd />

      {activeTab === "explore" ? (
        <ExploreScreen bottomInset={listBottomPad} topInset={listTopPad} />
      ) : (
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
          onEndReachedThreshold={0.35}
          onScroll={onFeedScroll}
          scrollEventThrottle={16}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          extraData={`${activeMediaPostId}:${preloadMediaPostId}`}
          removeClippedSubviews
          maxToRenderPerBatch={8}
          windowSize={7}
          initialNumToRender={6}
          contentContainerStyle={{
            paddingTop: listTopPad + (hasScrollHeader ? 8 : 0),
            paddingBottom: listBottomPad
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              progressViewOffset={listTopPad}
            />
          }
        />
      )}

      {commentPost ? (
        <CommentSheet
          visible
          postId={Number(commentPost.id)}
          postTitle={commentPost.title}
          onClose={() => setCommentPost(null)}
          onCommentCountChange={handleCommentCountChange}
        />
      ) : null}

      <LikesBottomSheet
        visible={likesPost != null}
        target={likesPost ? { type: "post", id: Number(likesPost.id) } : null}
        title="Likes"
        onClose={() => setLikesPost(null)}
        onUserPress={handleLikerPress}
      />

      <PostActionsBottomSheet
        visible={sharePost != null}
        post={sharePost}
        onClose={() => setSharePost(null)}
        onReposted={() => void refetchAll()}
        onNavigateFindMembers={() => navigation.navigate("SearchMembers")}
      />

      <BottomTabBar
        activeTab={activeTab}
        onTabPress={onTabPress}
        messageCount={summary?.unreadMessagesCount ?? 0}
        bottomInset={insets.bottom}
      />
    </View>
  );
}
