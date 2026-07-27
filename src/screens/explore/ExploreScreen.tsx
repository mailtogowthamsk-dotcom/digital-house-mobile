import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing } from "../../theme/spacing";
import { ExploreSearchBar } from "../../components/explore/ExploreSearchBar";
import { ExploreDiscoveryPane } from "../../components/explore/ExploreDiscoveryPane";
import { FeedPostCardRow, FeedPostSkeleton, type PostCardData } from "../../components/home";
import type { FeedPostCardActions } from "../../components/home/FeedPostCardRow";
import { CommentSheet } from "../../components/feed/CommentSheet";
import { LikesBottomSheet } from "../../components/likes/LikesBottomSheet";
import {
  PostActionsBottomSheet,
  type PostSharePayload
} from "../../components/share/PostActionsBottomSheet";
import { useExploreSearch } from "../../hooks/useExploreSearch";
import { useFeedInteractions } from "../../hooks/useFeedInteractions";
import { useNavigateToPostAuthor } from "../../hooks/useNavigateToPostAuthor";
import { trackFeedAction } from "../../utils/feedAnalytics";
import { emitPostUpdated } from "../../utils/postSync";
import { promptReportPost } from "../../utils/promptReportPost";
import { pauseAllFeedVideos } from "../../media/feedVideoPlayback";
import { pickActiveAndPreloadPostIds } from "../../utils/feedVideoVisibility";
import type { PostLiker } from "../../api/posts.api";
import { useAuth } from "../../context/AuthContext";

type Props = {
  /** Extra bottom padding for floating tab bar */
  bottomInset?: number;
  /** Clearance under floating glass header */
  topInset?: number;
};

/**
 * Explore discovery panel — keyword + hashtag search over community posts.
 * Reuses PostCard / feed interactions. Designed to embed under Home tabs.
 */
export function ExploreScreen({ bottomInset = 72, topInset = 0 }: Props) {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { user: authUser } = useAuth();
  const explore = useExploreSearch();
  const { toggleLike, addLike, toggleSave } = useFeedInteractions(explore.updatePost);
  const navigateToPostAuthor = useNavigateToPostAuthor();

  const [commentPost, setCommentPost] = useState<PostCardData | null>(null);
  const [likesPost, setLikesPost] = useState<PostCardData | null>(null);
  const [sharePost, setSharePost] = useState<PostSharePayload | null>(null);
  const [activeMediaPostId, setActiveMediaPostId] = useState<string | null>(null);
  const [preloadMediaPostId, setPreloadMediaPostId] = useState<string | null>(null);
  const [retainMediaPostId, setRetainMediaPostId] = useState<string | null>(null);
  const resultsRef = useRef<PostCardData[]>([]);
  const commentPostIdRef = useRef<string | null>(null);
  commentPostIdRef.current = commentPost?.id ?? null;
  resultsRef.current = explore.results;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 65,
    minimumViewTime: 120
  }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item: PostCardData; isViewable: boolean }> }) => {
      const { activeId } = pickActiveAndPreloadPostIds(viewableItems, resultsRef.current);
      if (activeId) setActiveMediaPostId(activeId);
    }
  ).current;

  useEffect(() => {
    const items = explore.results;
    if (!items.length) {
      setActiveMediaPostId(null);
      setPreloadMediaPostId(null);
      setRetainMediaPostId(null);
      return;
    }
    setActiveMediaPostId((prev) =>
      prev && items.some((p) => p.id === prev) ? prev : items[0]!.id
    );
  }, [explore.results]);

  useEffect(() => {
    const items = explore.results;
    if (!items.length || !activeMediaPostId) {
      setPreloadMediaPostId(null);
      setRetainMediaPostId(null);
      return;
    }
    const idx = items.findIndex((p) => p.id === activeMediaPostId);
    setPreloadMediaPostId(idx >= 0 && idx + 1 < items.length ? items[idx + 1]!.id : null);
    setRetainMediaPostId(idx > 0 ? items[idx - 1]!.id : null);
  }, [explore.results, activeMediaPostId]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        pauseAllFeedVideos();
      };
    }, [])
  );

  const showResults = explore.debouncedQuery.length > 0;

  const handleAuthorPress = useCallback(
    (item: PostCardData) => {
      if (!item.authorUserId && !item.authorUsername) return;
      trackFeedAction("author_profile_open", Number(item.id), { source: "explore" });
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
      trackFeedAction("post_report", Number(item.id), { source: "explore" });
      promptReportPost(Number(item.id));
    },
    onActivateMedia: (postId) => {
      setActiveMediaPostId(postId);
      setPreloadMediaPostId((prev) => (prev === postId ? null : prev));
    },
    onDoubleTap: (item) => addLike(item.id, item),
    onLikePress: (item) => toggleLike(item.id, item),
    onLikeCountPress: (item) => {
      trackFeedAction("likes_sheet_open", Number(item.id), { source: "explore" });
      setLikesPost(item);
    },
    onCommentPress: (item) => {
      trackFeedAction("comment_sheet_open", Number(item.id), { source: "explore" });
      setCommentPost(item);
    },
    onSavePress: (item) => toggleSave(item.id, item),
    onSharePress: (item) => {
      trackFeedAction("share", Number(item.id), { source: "explore" });
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

  const renderItem = useCallback(
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

  const handleCommentCountChange = useCallback(
    (count: number) => {
      const id = commentPostIdRef.current;
      if (id) {
        explore.updatePost(id, { commentCount: count });
        emitPostUpdated(Number(id), { commentCount: count });
      }
    },
    [explore.updatePost]
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

  const ListEmpty = useMemo(() => {
    if (!showResults) return null;
    if (explore.loading) {
      return (
        <View>
          <FeedPostSkeleton />
          <FeedPostSkeleton />
        </View>
      );
    }
    if (explore.error) {
      return (
        <View style={styles.empty}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Search failed</Text>
          <Pressable
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={explore.retry}
          >
            <Text style={[styles.retryText, { color: colors.white }]}>Retry</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={styles.empty}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceElevated }]}>
          <Ionicons name="search-outline" size={36} color={colors.textSecondary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No matching posts found.</Text>
        <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
          Try another keyword, author name, or #hashtag.
        </Text>
      </View>
    );
  }, [colors, explore.error, explore.loading, explore.retry, showResults]);

  const ListHeader = useMemo(
    () => (
      <View style={styles.headerBlock}>
        <ExploreSearchBar value={explore.query} onChangeText={explore.setQuery} autoFocus={false} />
        {showResults && !explore.loading && explore.total > 0 ? (
          <Text style={[styles.resultMeta, { color: colors.textSecondary }]}>
            {explore.total} result{explore.total === 1 ? "" : "s"}
          </Text>
        ) : null}
        {!showResults ? (
          <View style={styles.discoveryPad}>
            <ExploreDiscoveryPane
              recent={explore.recent}
              trendingHashtags={explore.discovery?.trendingHashtags ?? []}
              suggestedTopics={explore.discovery?.suggestedTopics ?? []}
              onSelectQuery={explore.applyRecent}
              onClearRecent={() => void explore.clearHistory()}
              onRemoveRecent={(q) => void explore.removeRecent(q)}
            />
          </View>
        ) : null}
      </View>
    ),
    [
      colors.textSecondary,
      explore.query,
      explore.setQuery,
      explore.loading,
      explore.total,
      explore.recent,
      explore.discovery,
      explore.applyRecent,
      explore.clearHistory,
      explore.removeRecent,
      showResults
    ]
  );

  const listContentStyle = useMemo(
    () => ({
      paddingBottom: bottomInset,
      paddingTop: topInset + spacing.md
    }),
    [bottomInset, topInset]
  );

  const keyExtractor = useCallback((item: PostCardData) => item.id, []);

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <FlatList
        style={styles.fill}
        data={showResults ? explore.results : []}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={showResults ? ListEmpty : null}
        ListFooterComponent={
          explore.loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null
        }
        onEndReached={explore.loadMore}
        onEndReachedThreshold={0.35}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        extraData={`${activeMediaPostId}:${preloadMediaPostId}:${retainMediaPostId}`}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={listContentStyle}
        removeClippedSubviews={false}
        maxToRenderPerBatch={2}
        windowSize={3}
        updateCellsBatchingPeriod={50}
        initialNumToRender={2}
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
        onNavigateFindMembers={() => navigation.navigate("SearchMembers")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  headerBlock: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  discoveryPad: { marginTop: spacing.lg },
  resultMeta: { marginTop: spacing.sm, fontSize: 13, fontWeight: "600" },
  empty: {
    paddingVertical: 48,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    gap: 10
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", textAlign: "center" },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  retryBtn: { marginTop: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  retryText: { fontSize: 14, fontWeight: "600" },
  footer: { paddingVertical: 16, alignItems: "center" }
});
