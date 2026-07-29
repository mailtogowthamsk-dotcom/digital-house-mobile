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
  FeedPostCardRow,
  BottomTabBar,
  HighlightSection,
  FeedPostSkeleton,
  hasHighlightsData
} from "../../components/home";
import type { FeedPostCardActions } from "../../components/home/FeedPostCardRow";
import type { PostCardData } from "../../components/home";
import { CommentSheet } from "../../components/feed/CommentSheet";
import { PaginationFooter } from "../../components/ui/PaginationFooter";
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
import { pickActiveAndPreloadPostIds } from "../../utils/feedVideoVisibility";
import { useFeedInteractions } from "../../hooks/useFeedInteractions";
import { useFeedRealtime } from "../../hooks/useFeedRealtime";
import { useNavigateToPostAuthor } from "../../hooks/useNavigateToPostAuthor";
import { PlatformBannerStrip, PlatformAnnouncementCard, PlatformHomeAd } from "../../components/platform/PlatformGateOverlay";
import { getErrorStatus, isSessionInvalid401 } from "../../api/client";
import { messages } from "../../theme/messages";
import { trackFeedAction } from "../../utils/feedAnalytics";
import { emitPostUpdated } from "../../utils/postSync";
import { promptReportPost } from "../../utils/promptReportPost";
import { openMessagesInbox } from "../../navigation/openMessages";
import { handleMainTabPress } from "../../navigation/mainTabs";
import type { RootStackParamList } from "../../navigation/types";
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
  const [retainMediaPostId, setRetainMediaPostId] = useState<string | null>(null);
  const feedItemsRef = useRef<PostCardData[]>([]);
  const activeMediaPostIdRef = useRef<string | null>(null);
  activeMediaPostIdRef.current = activeMediaPostId;
  const activeMediaSwitchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 55,
    minimumViewTime: 160
  }).current;
  const queueActiveMediaId = useRef((id: string | null) => {
    if (!id || activeMediaPostIdRef.current === id) return;
    if (activeMediaSwitchTimer.current) clearTimeout(activeMediaSwitchTimer.current);
    // First assignment is applied synchronously: startup layout churn (header
    // growth, highlights loading) emits repeated viewability updates that keep
    // rescheduling the timer, which starves the very first activation.
    if (!activeMediaPostIdRef.current) {
      activeMediaSwitchTimer.current = null;
      activeMediaPostIdRef.current = id;
      setActiveMediaPostId(id);
      return;
    }
    // Hysteresis — slow reverse scroll used to thrash active↔retain and freeze the UI.
    activeMediaSwitchTimer.current = setTimeout(() => {
      activeMediaSwitchTimer.current = null;
      setActiveMediaPostId((prev) => (prev === id ? prev : id));
    }, 180);
  }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item: PostCardData; isViewable: boolean }> }) => {
      const { activeId } = pickActiveAndPreloadPostIds(viewableItems, feedItemsRef.current);
      queueActiveMediaId(activeId);
    }
  ).current;

  useEffect(
    () => () => {
      if (activeMediaSwitchTimer.current) clearTimeout(activeMediaSwitchTimer.current);
    },
    []
  );

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

  // Keep previous / next relative to current for instant scroll-back + preload.
  useEffect(() => {
    if (!feedItems.length) {
      setActiveMediaPostId(null);
      setPreloadMediaPostId(null);
      setRetainMediaPostId(null);
      return;
    }
    setActiveMediaPostId((prev) =>
      prev && feedItems.some((p) => p.id === prev) ? prev : feedItems[0]!.id
    );
  }, [feedItems]);

  useEffect(() => {
    if (!feedItems.length || !activeMediaPostId) {
      setPreloadMediaPostId(null);
      setRetainMediaPostId(null);
      return;
    }
    const idx = feedItems.findIndex((p) => p.id === activeMediaPostId);
    setPreloadMediaPostId(
      idx >= 0 && idx + 1 < feedItems.length ? feedItems[idx + 1]!.id : null
    );
    setRetainMediaPostId(idx > 0 ? feedItems[idx - 1]!.id : null);
  }, [feedItems, activeMediaPostId]);

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
      // Pause only — keep activeMediaPostId so the player stays mounted and
      // resumes when playbackAllowed becomes true again (viewability often
      // does not re-fire on focus, which left a dead play button).
      return () => {
        pauseAllFeedVideos();
      };
    }, [route.params?.tab])
  );

  useAppResume(() => {
    // Soft: summary badges only — avoid full feed refetch on every foreground.
    void retrySummaryRef.current();
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
        // Switching feed panes: drop active players so the other pane starts clean.
        setActiveMediaPostId(null);
        setPreloadMediaPostId(null);
        pauseAllFeedVideos();
      }
      setActiveTab(tab);
      return;
    }
    // Leaving to Messages / Profile / etc. — pause but keep active id for resume.
    if (tab !== activeTab) {
      pauseAllFeedVideos();
    }
    handleMainTabPress(navigation, activeTab, tab);
  };

  const onMenuPress = useCallback(() => {
    navigation.navigate("Menu", {
      messageCount: summary?.unreadMessagesCount ?? 0
    });
  }, [navigation, summary?.unreadMessagesCount]);

  const onNotificationPress = useCallback(() => {
    navigation.navigate("Notifications");
  }, [navigation]);

  const onMessagePress = useCallback(() => {
    openMessagesInbox(navigation);
  }, [navigation]);
  const onFeedScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const dy = y - lastScrollY.current;
      lastScrollY.current = y;
      if (y <= 12) {
        // The first card sits under the list header at offset 0, so it never reaches the
        // viewability threshold. Viewability alone would leave the old (off-screen) post active.
        queueActiveMediaId(feedItemsRef.current[0]?.id ?? null);
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
    [headerHideProgress, queueActiveMediaId]
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

  const feedActionsRef = useRef<FeedPostCardActions>({
    onAuthorPress: () => {},
    onDoubleTap: () => {},
    onLikePress: () => {},
    onLikeCountPress: () => {},
    onCommentPress: () => {},
    onSavePress: () => {},
    onSharePress: () => {}
  });
  feedActionsRef.current = {
    onAuthorPress: handleAuthorPress,
    shouldShowMenu: (item) =>
      !(authUser?.id != null && item.authorUserId === authUser.id),
    onMenuPress: (item) => {
      trackFeedAction("post_report", Number(item.id));
      promptReportPost(Number(item.id));
    },
    onActivateMedia: (postId) => {
      if (activeMediaSwitchTimer.current) {
        clearTimeout(activeMediaSwitchTimer.current);
        activeMediaSwitchTimer.current = null;
      }
      activeMediaPostIdRef.current = postId;
      setActiveMediaPostId(postId);
      setPreloadMediaPostId((prev) => (prev === postId ? null : prev));
    },
    onDoubleTap: (item) => addLike(item.id, item),
    onLikePress: (item) => toggleLike(item.id, item),
    onLikeCountPress: (item) => {
      trackFeedAction("likes_sheet_open", Number(item.id));
      setLikesPost(item);
    },
    onCommentPress: (item) => {
      trackFeedAction("comment_sheet_open", Number(item.id));
      setCommentPost(item);
    },
    onSavePress: (item) => toggleSave(item.id, item),
    onSharePress: (item) => {
      trackFeedAction("share", Number(item.id));
      setSharePost({
        postId: Number(item.id),
        title: item.title,
        authorName: item.userName,
        mediaUrl: item.imageUri,
        mediaType: item.mediaType,
        thumbnailUrl: item.thumbnailUrl
      });
    }
  };

  const renderFeedItem = useCallback(
    ({ item }: { item: PostCardData }) => (
      <FeedPostCardRow
        post={item}
        isMediaActive={item.id === activeMediaPostId}
        isMediaPreload={item.id === preloadMediaPostId}
        isMediaRetain={item.id === retainMediaPostId}
        actionsRef={feedActionsRef}
      />
    ),
    [activeMediaPostId, preloadMediaPostId, retainMediaPostId]
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
      const index = feedItems.findIndex((p) => Number(p.id) === item.postId);
      if (index >= 0) {
        try {
          listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.05 });
        } catch {
          /* index may be off-screen until layout */
        }
        return;
      }
      const match = feedItems.find((p) => Number(p.id) === item.postId);
      if (match) setCommentPost(match);
    },
    [feedItems]
  );

  const listTopPad = insets.top + FLOATING_HEADER_HEIGHT + 8;
  const listBottomPad = Math.max(insets.bottom, 8) + FLOATING_TAB_BAR_HEIGHT + 16;

  const feedContentStyle = useMemo(
    () => ({
      paddingTop: listTopPad + (hasScrollHeader ? 8 : 0),
      paddingBottom: listBottomPad
    }),
    [listTopPad, listBottomPad, hasScrollHeader]
  );

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

  const ListFooterComponent = useCallback(
    () => (
      <PaginationFooter
        loading={feedLoadingMore}
        endReached={
          !feedLoading &&
          !feedError &&
          feedItems.length > 0 &&
          feedTotal > 0 &&
          feedItems.length >= feedTotal
        }
      />
    ),
    [feedLoadingMore, feedLoading, feedError, feedItems.length, feedTotal]
  );

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
        communityName={
          summary?.user?.community?.trim() ||
          summary?.user?.kulam?.trim() ||
          authUser?.community?.trim() ||
          authUser?.kulam?.trim() ||
          null
        }
        notificationCountFallback={summary?.unreadNotificationsCount ?? 0}
        messageCount={summary?.unreadMessagesCount ?? 0}
        onNotificationPress={onNotificationPress}
        onMessagePress={onMessagePress}
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
          extraData={activeMediaPostId}
          removeClippedSubviews={false}
          maxToRenderPerBatch={3}
          windowSize={5}
          updateCellsBatchingPeriod={50}
          initialNumToRender={3}
          contentContainerStyle={feedContentStyle}
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
