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
  Animated,
  Platform
} from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Header,
  FLOATING_HEADER_HEIGHT,
  FLOATING_TAB_BAR_HEIGHT,
  BOTTOM_TAB_BAR_HEIGHT,
  DismissibleWelcomeCard,
  FeedPostCardRow,
  BottomTabBar,
  FeedPostSkeleton
} from "../../components/home";
import type { FeedPostCardActions } from "../../components/home/FeedPostCardRow";
import type { PostCardData } from "../../components/home";
import { CommentSheet } from "../../components/feed/CommentSheet";
import { PaginationFooter } from "../../components/ui/PaginationFooter";
import { LikesBottomSheet } from "../../components/likes/LikesBottomSheet";
import {
  PostActionsBottomSheet,
  postCardToSharePayload,
  type PostSharePayload
} from "../../components/share/PostActionsBottomSheet";
import type { PostLiker } from "../../api/posts.api";
import { useTheme } from "../../theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useHome } from "../../hooks/useHome";
import { startupMark } from "../../utils/startupTiming";
import { useWelcomeCardVisible } from "../../hooks/useWelcomeCardVisible";
import { useAppResume } from "../../hooks/useAppResume";
import { pauseAllFeedVideos } from "../../media/feedVideoPlayback";
import {
  buildMediaWindow,
  pickActiveAndPreloadPostIds,
  prefetchFeedVideosInWindow
} from "../../utils/feedVideoVisibility";
import {
  clearFeedMediaFocus,
  getFeedMediaFocus,
  setFeedMediaFocus
} from "../../media/feedMediaFocus";
import { setFeedAdSlotVisible } from "../../media/feedAdSlotVisibility";
import { FEED_FLATLIST_PERF } from "../../utils/listPerf";
import { useFeedInteractions } from "../../hooks/useFeedInteractions";
import { useFeedRealtime } from "../../hooks/useFeedRealtime";
import { useNavigateToPostAuthor } from "../../hooks/useNavigateToPostAuthor";
import { PlatformBannerStrip, PlatformAnnouncementCard, PlatformHomeAd } from "../../components/platform/PlatformGateOverlay";
import { PaidFeedAd } from "../../components/advertisement/PaidFeedAd";
import { getErrorStatus, isSessionInvalid401 } from "../../api/client";
import { messages } from "../../theme/messages";
import { trackFeedAction } from "../../utils/feedAnalytics";
import { syncFeedImpressions } from "../../utils/feedImpressionTracker";
import { emitPostUpdated } from "../../utils/postSync";
import { promptReportPost } from "../../utils/promptReportPost";
import { openMessagesInbox } from "../../navigation/openMessages";
import { handleMainTabPress } from "../../navigation/mainTabs";
import type { RootStackParamList } from "../../navigation/types";
import type { TabId } from "../../components/home/BottomTabBar";
import { ExploreScreen } from "../explore/ExploreScreen";
import { StoryTray } from "../../components/stories/StoryTray";
import { getStoryTray, invalidateStoriesTray, type StoryGroup } from "../../api/stories.api";
import { subscribeStoriesChanged } from "../../utils/storiesEvents";
import { subscribeStartupStoryGroups } from "../../utils/startupStorySeed";

const PADDING = 16;
const SECTION_MARGIN = 28;
const HEADER_HIDE_DELTA = 8;

/**
 * Home Screen – community feed, welcome card, bottom tabs.
 * Data from useHome(); no inline API calls. Handles 401 → Login, 403 → PendingApproval.
 */
function applyViewedStories(groups: StoryGroup[], viewedIds: ReadonlySet<number>): StoryGroup[] {
  return groups.map((group) => {
    if (group.is_own || !group.stories.some((story) => !story.viewed_by_me && viewedIds.has(story.id))) {
      return group;
    }
    const stories = group.stories.map((story) =>
      viewedIds.has(story.id) ? { ...story, viewed_by_me: true } : story
    );
    return { ...group, stories, has_unseen: stories.some((story) => !story.viewed_by_me) };
  });
}

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, "Home">>();
  const { signOut, user: authUser } = useAuth();
  const { colors } = useTheme();
  const welcomeCardVisible = useWelcomeCardVisible();
  const {
    state,
    refetchAll,
    loadMoreFeed,
    updatePost,
    retrySummary,
    retryFeed
  } = useHome();

  useEffect(() => {
    const hasContent =
      (!!state.summary && !state.summaryLoading) ||
      (state.feedItems.length > 0 && !state.feedLoading);
    if (!hasContent) return;
    startupMark("home_first_render", {
      hasSummary: !!state.summary,
      feedCount: state.feedItems.length
    });
  }, [
    state.summary,
    state.summaryLoading,
    state.feedItems.length,
    state.feedLoading
  ]);

  const { toggleLike, addLike, toggleSave } = useFeedInteractions(updatePost);
  const navigateToPostAuthor = useNavigateToPostAuthor();

  const [activeTab, setActiveTab] = useState<TabId>(
    route.params?.tab === "explore" ? "explore" : "home"
  );
  const [refreshing, setRefreshing] = useState(false);
  const [adRefreshKey, setAdRefreshKey] = useState(0);
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const viewedStoryIds = useRef(new Set<number>());
  const [storiesLoading, setStoriesLoading] = useState(true);
  const [commentPost, setCommentPost] = useState<{ id: string; title: string } | null>(null);
  const [likesPostId, setLikesPostId] = useState<string | null>(null);
  const [sharePost, setSharePost] = useState<PostSharePayload | null>(null);
  const commentPostIdRef = useRef<string | null>(null);
  const listRef = useRef<FlatList<PostCardData>>(null);
  const focusRefreshRef = useRef(false);
  const headerHideProgress = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const headerHiddenRef = useRef(false);
  const feedItemsRef = useRef<PostCardData[]>([]);
  const activeMediaSwitchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 40,
    minimumViewTime: 120
  }).current;
  const queueMediaWindow = useRef((activeId: string | null) => {
    if (!activeId) return;
    const next = buildMediaWindow(activeId, feedItemsRef.current);
    const current = getFeedMediaFocus();
    if (
      current.activeId === next.activeId &&
      current.preloadId === next.preloadId &&
      current.retainId === next.retainId
    ) {
      return;
    }
    if (activeMediaSwitchTimer.current) clearTimeout(activeMediaSwitchTimer.current);
    // First assignment is applied synchronously: startup layout churn (header
    // growth) emits repeated viewability updates that keep
    // rescheduling the timer, which starves the very first activation.
    if (!current.activeId) {
      activeMediaSwitchTimer.current = null;
      setFeedMediaFocus(next);
      prefetchFeedVideosInWindow(next, feedItemsRef.current);
      return;
    }
    // Hysteresis — slow reverse scroll used to thrash active↔retain and freeze the UI.
    activeMediaSwitchTimer.current = setTimeout(() => {
      activeMediaSwitchTimer.current = null;
      setFeedMediaFocus(next);
      prefetchFeedVideosInWindow(next, feedItemsRef.current);
    }, 180);
  }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item: PostCardData; isViewable: boolean; index: number | null }> }) => {
      const { activeId } = pickActiveAndPreloadPostIds(viewableItems, feedItemsRef.current);
      queueMediaWindow(activeId);
      const visibleIds = viewableItems
        .filter((v) => v.isViewable && v.item?.id)
        .map((v) => String(v.item.id));
      syncFeedImpressions(visibleIds);
      const sponsorRowIndex = Math.min(2, feedItemsRef.current.length - 1);
      setFeedAdSlotVisible(viewableItems.some((row) => row.isViewable && row.index === sponsorRowIndex));
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
    feedError
  } = state;

  feedItemsRef.current = feedItems;

  useEffect(() => {
    if (!feedItems.length) {
      clearFeedMediaFocus();
      return;
    }
    const current = getFeedMediaFocus();
    if (current.activeId && feedItems.some((p) => p.id === current.activeId)) return;
    const next = buildMediaWindow(feedItems[0]!.id, feedItems);
    setFeedMediaFocus(next);
    prefetchFeedVideosInWindow(next, feedItems);
  }, [feedItems]);

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

  const loadStories = useCallback(async (opts?: { force?: boolean }) => {
    try {
      setStoriesLoading(true);
      const groups = await getStoryTray({ force: opts?.force });
      setStoryGroups(applyViewedStories(groups, viewedStoryIds.current));
      // Do not prefetch story media on home — download only when the viewer opens.
    } catch {
      /* keep previous tray */
    } finally {
      setStoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    let gotSeed = false;
    const unsub = subscribeStartupStoryGroups((groups) => {
      gotSeed = true;
      setStoryGroups(applyViewedStories(groups, viewedStoryIds.current));
      setStoriesLoading(false);
    });
    const t = setTimeout(() => {
      if (!gotSeed) void loadStories();
    }, 1500);
    return () => {
      unsub();
      clearTimeout(t);
    };
  }, [loadStories]);

  useEffect(() => {
    const sub = subscribeStoriesChanged((payload) => {
      if (payload.viewedId != null) {
        viewedStoryIds.current.add(payload.viewedId);
        setStoryGroups((prev) => applyViewedStories(prev, viewedStoryIds.current));
        invalidateStoriesTray();
        return;
      }
      if (payload.deletedId != null) {
        setStoryGroups((prev) =>
          prev
            .map((g) => ({
              ...g,
              stories: g.stories.filter((s) => s.id !== payload.deletedId)
            }))
            .filter((g) => g.stories.length > 0 || g.is_own)
        );
      }
      // Invalidate + single forced refresh (TTL coalesces with a concurrent focus reload).
      invalidateStoriesTray();
      void loadStories({ force: true });
    });
    return () => sub.remove();
  }, [loadStories]);

  useFocusEffect(
    useCallback(() => {
      const tab = route.params?.tab;
      if (tab === "explore" || tab === "home") {
        setActiveTab(tab);
      }
      if (focusRefreshRef.current) {
        // Soft re-entry: reuse bootstrap / TTL (force: false). Do not fan out summary+stories.
        void refetchAll({ force: false });
      } else {
        focusRefreshRef.current = true;
      }
      return () => {
        pauseAllFeedVideos();
      };
    }, [route.params?.tab, refetchAll])
  );

  useAppResume(() => {
    void refetchAll({ force: false });
  });

  useEffect(() => {
    if (summaryError) handleAuthError(summaryError);
  }, [summaryError, handleAuthError]);

  useEffect(() => {
    if (feedError) handleAuthError(feedError);
  }, [feedError, handleAuthError]);

  const onRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    setAdRefreshKey((k) => k + 1);
    setFeedAdSlotVisible(false);
    try {
      // P4B: single /home/bootstrap (stories seeded from response — no parallel tray GET).
      await refetchAll({ force: true });
    } finally {
      setRefreshing(false);
    }
  }, [refetchAll, refreshing]);

  const onTabPress = (tab: TabId) => {
    if (tab === "create") {
      navigation.navigate("CreatePost");
      return;
    }
    if (tab === "home" && activeTab === "home") {
      setFeedAdSlotVisible(false);
      void onRefresh();
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
      return;
    }
    if (tab === "home" || tab === "explore") {
      if (tab !== activeTab) {
        // Switching feed panes: drop active players so the other pane starts clean.
        clearFeedMediaFocus();
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
        queueMediaWindow(feedItemsRef.current[0]?.id ?? null);
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
    [headerHideProgress, queueMediaWindow]
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
      setFeedMediaFocus(buildMediaWindow(postId, feedItemsRef.current));
    },
    onDoubleTap: (item) => addLike(item.id, item),
    onLikePress: (item) => toggleLike(item.id, item),
    onLikeCountPress: (item) => {
      trackFeedAction("likes_sheet_open", Number(item.id));
      setLikesPostId(item.id);
    },
    onCommentPress: (item) => {
      trackFeedAction("comment_sheet_open", Number(item.id));
      setCommentPost({ id: item.id, title: item.title });
    },
    onSavePress: (item) => toggleSave(item.id, item),
    onSharePress: (item) => {
      trackFeedAction("share", Number(item.id));
      setSharePost(postCardToSharePayload(item));
    },
    onViewJob: (item) => {
      trackFeedAction("post_open", Number(item.id), { source: "feed_job_card" });
      navigation.navigate("PostDetail", { postId: Number(item.id) });
    },
    onViewMarketplace: (item) => {
      trackFeedAction("post_open", Number(item.id), { source: "feed_marketplace_card" });
      navigation.navigate("PostDetail", { postId: Number(item.id) });
    },
    onViewHelp: (item) => {
      trackFeedAction("post_open", Number(item.id), { source: "feed_help_card" });
      navigation.navigate("PostDetail", { postId: Number(item.id) });
    }
  };

  const sponsorRowIndex = Math.min(2, feedItems.length - 1);
  const renderFeedItem = useCallback(
    ({ item, index }: { item: PostCardData; index: number }) => (
      <>
        <FeedPostCardRow post={item} actionsRef={feedActionsRef} fullWidth />
        {index === 0 ? (
          <>
            <PlatformAnnouncementCard />
            {showWelcomeCard && welcomeUser ? (
              <DismissibleWelcomeCard userName={welcomeUser.name} avatarUri={welcomeUser.profileImage} />
            ) : null}
          </>
        ) : null}
        {index === sponsorRowIndex ? (
          <View collapsable={false}>
            <PaidFeedAd placement="home" refreshKey={adRefreshKey} />
            <PlatformHomeAd />
          </View>
        ) : null}
      </>
    ),
    [sponsorRowIndex, adRefreshKey, showWelcomeCard, welcomeUser]
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
      setLikesPostId(null);
      if (liker.isCurrentUser) {
        navigation.navigate("Profile");
        return;
      }
      navigation.navigate("MemberProfile", { userId: liker.userId });
    },
    [navigation]
  );

  const headerClearance = insets.top + FLOATING_HEADER_HEIGHT;
  const listTopPad = headerClearance + 8;
  const feedBottomPad = Math.max(insets.bottom, 10) + BOTTOM_TAB_BAR_HEIGHT + 4;
  const exploreBottomPad = Math.max(insets.bottom, 8) + FLOATING_TAB_BAR_HEIGHT + 16;

  const feedContentStyle = useMemo(
    () => ({
      paddingTop: headerClearance,
      paddingBottom: feedBottomPad
    }),
    [headerClearance, feedBottomPad]
  );

  const s = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        feedList: { flex: 1, backgroundColor: "transparent" },
        headerPad: { paddingHorizontal: PADDING },
        section: { marginBottom: SECTION_MARGIN },
        feedSkeleton: { marginBottom: 0 },
        paginationFooter: { paddingVertical: 8 },
        feedIntro: {
          backgroundColor: colors.surface,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border
        },
        emptyActions: { marginTop: 16, gap: 8, alignItems: "stretch" },
        exploreButton: { minHeight: 44, justifyContent: "center", alignItems: "center" },
        exploreText: { fontSize: 13, fontWeight: "600", color: colors.primary },
        errorCard: {
          marginHorizontal: 8,
          paddingVertical: 28,
          paddingHorizontal: PADDING,
          alignItems: "center",
          backgroundColor: colors.surface,
          borderRadius: 22,
          gap: 12
        },
        errorText: { fontSize: 13, color: colors.textSecondary },
        retryBtn: {
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: colors.primary,
          borderRadius: 12
        },
        retryBtnText: { fontSize: 13, fontWeight: "600", color: colors.white },
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
          fontSize: 16,
          fontWeight: "600",
          color: colors.text,
          marginBottom: 8
        },
        emptySubtitle: {
          fontSize: 13,
          color: colors.textSecondary,
          textAlign: "center",
          lineHeight: 21
        }
      }),
    [colors]
  );

  const listHeader = useMemo(
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

        <View style={s.feedIntro}>
          <StoryTray
            groups={storyGroups}
            loading={storiesLoading}
            currentUser={
              authUser
                ? {
                    id: authUser.id,
                    name: authUser.fullName,
                    profileImage: authUser.profilePhoto ?? null
                  }
                : null
            }
            onAddStory={() => navigation.navigate("CreateStory")}
            onOpenGroup={(groups, index) => {
              navigation.navigate("StoryViewer", { groups, initialGroupIndex: index });
            }}
          />
        </View>

        {feedItems.length === 0 ? <PlatformAnnouncementCard /> : null}
      </>
    ),
    [
      feedItems.length,
      showSummaryError,
      retrySummary,
      s,
      storyGroups,
      storiesLoading,
      authUser,
      navigation
    ]
  );

  const ListFooterComponent = useCallback(
    () => (
      <PaginationFooter
        loading={feedLoadingMore}
        style={s.paginationFooter}
        endReached={
          !feedLoading &&
          !feedError &&
          feedItems.length > 0 &&
          feedTotal > 0 &&
          feedItems.length >= feedTotal
        }
      />
    ),
    [feedLoadingMore, feedLoading, feedError, feedItems.length, feedTotal, s.paginationFooter]
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
        <View style={s.emptyActions}>
          <Pressable
            style={s.retryBtn}
            onPress={() => navigation.navigate("CreatePost")}
            accessibilityRole="button"
          >
            <Text style={s.retryBtnText}>Create a post</Text>
          </Pressable>
          <Pressable
            style={s.exploreButton}
            onPress={() => setActiveTab("explore")}
            accessibilityRole="button"
          >
            <Text style={s.exploreText}>Explore</Text>
          </Pressable>
        </View>
      </View>
    );
  }, [feedLoading, feedError, retryFeed, messages.empty.feed, s, colors, navigation]);

  return (
    <View style={s.container}>
      <Header
        communityName={
          summary?.user?.community?.trim() ||
          summary?.user?.kulam?.trim() ||
          authUser?.community?.trim() ||
          authUser?.kulam?.trim() ||
          null
        }
        notificationCountFallback={0}
        messageCount={summary?.unreadMessagesCount ?? 0}
        onNotificationPress={onNotificationPress}
        onMessagePress={onMessagePress}
        onMenuPress={onMenuPress}
        hideProgress={headerHideProgress}
        topInset={insets.top}
      />

      <PlatformBannerStrip />

      {activeTab === "explore" ? (
        <ExploreScreen bottomInset={exploreBottomPad} topInset={listTopPad} />
      ) : (
        <FlatList
          ref={listRef}
          style={s.feedList}
          data={feedItems}
          renderItem={renderFeedItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={listHeader}
          keyboardShouldPersistTaps="handled"
          overScrollMode={Platform.OS === "android" ? "never" : undefined}
          ListFooterComponent={ListFooterComponent}
          ListEmptyComponent={ListEmptyComponent}
          onEndReached={loadMoreFeed}
          onEndReachedThreshold={0.35}
          onScroll={onFeedScroll}
          scrollEventThrottle={FEED_FLATLIST_PERF.scrollEventThrottle}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          removeClippedSubviews={FEED_FLATLIST_PERF.removeClippedSubviews}
          maxToRenderPerBatch={FEED_FLATLIST_PERF.maxToRenderPerBatch}
          windowSize={FEED_FLATLIST_PERF.windowSize}
          updateCellsBatchingPeriod={FEED_FLATLIST_PERF.updateCellsBatchingPeriod}
          initialNumToRender={FEED_FLATLIST_PERF.initialNumToRender}
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
        visible={likesPostId != null}
        target={likesPostId ? { type: "post", id: Number(likesPostId) } : null}
        title="Likes"
        onClose={() => setLikesPostId(null)}
        onUserPress={handleLikerPress}
      />

      <PostActionsBottomSheet
        visible={sharePost != null}
        post={sharePost}
        onClose={() => setSharePost(null)}
        onReposted={() => void refetchAll({ force: true })}
        onUndoRepost={() => void refetchAll({ force: true })}
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
