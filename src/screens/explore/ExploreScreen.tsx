import React, { useCallback, useMemo, useRef, useState } from "react";
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
import { PostCard, FeedPostSkeleton, type PostCardData } from "../../components/home";
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
import { pauseAllFeedVideos } from "../../media/feedVideoPlayback";
import { pickActiveAndPreloadVideoIds } from "../../utils/feedVideoVisibility";
import type { PostLiker } from "../../api/posts.api";

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
  const explore = useExploreSearch();
  const { toggleLike, addLike, toggleSave } = useFeedInteractions(explore.updatePost);
  const navigateToPostAuthor = useNavigateToPostAuthor();

  const [commentPost, setCommentPost] = useState<PostCardData | null>(null);
  const [likesPost, setLikesPost] = useState<PostCardData | null>(null);
  const [sharePost, setSharePost] = useState<PostSharePayload | null>(null);
  const [activeMediaPostId, setActiveMediaPostId] = useState<string | null>(null);
  const [preloadMediaPostId, setPreloadMediaPostId] = useState<string | null>(null);
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
      const { activeId, preloadId } = pickActiveAndPreloadVideoIds(
        viewableItems,
        resultsRef.current
      );
      setActiveMediaPostId(activeId);
      setPreloadMediaPostId(preloadId);
    }
  ).current;

  useFocusEffect(
    useCallback(() => {
      return () => {
        setActiveMediaPostId(null);
        setPreloadMediaPostId(null);
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

  const renderItem = useCallback(
    ({ item }: { item: PostCardData }) => (
      <PostCard
        post={{
          ...item,
          isMediaActive: item.id === activeMediaPostId,
          isMediaPreload: item.id === preloadMediaPostId
        }}
        onAuthorPress={() => handleAuthorPress(item)}
        onPress={() => {
          trackFeedAction("post_open", Number(item.id), { source: "explore" });
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
    [activeMediaPostId, preloadMediaPostId, addLike, handleAuthorPress, navigation, toggleLike, toggleSave]
  );

  const handleCommentCountChange = useCallback(
    (count: number) => {
      const id = commentPostIdRef.current;
      if (id) {
        explore.updatePost(id, { commentCount: count });
        emitPostUpdated(Number(id), { commentCount: count });
      }
    },
    [explore]
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
    [colors.textSecondary, explore, showResults]
  );

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <FlatList
        style={styles.fill}
        data={showResults ? explore.results : []}
        keyExtractor={(item) => item.id}
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
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          paddingBottom: bottomInset,
          paddingTop: topInset + spacing.md
        }}
        removeClippedSubviews
        maxToRenderPerBatch={8}
        windowSize={7}
        initialNumToRender={4}
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
