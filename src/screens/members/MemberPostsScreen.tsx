import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
  RefreshControl
} from "react-native";
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing } from "../../theme/spacing";
import { PostCard, type PostCardData } from "../../components/home/PostCard";
import { CommentSheet } from "../../components/feed/CommentSheet";
import { LikesBottomSheet } from "../../components/likes/LikesBottomSheet";
import {
  PostActionsBottomSheet,
  type PostSharePayload
} from "../../components/share/PostActionsBottomSheet";
import { useMemberPosts } from "../../hooks/useMemberPosts";
import { useFeedInteractions } from "../../hooks/useFeedInteractions";
import { memberPostToCardData } from "../../utils/postMappers";
import { trackFeedAction } from "../../utils/feedAnalytics";
import { promptReportPost } from "../../utils/promptReportPost";
import type { PostLiker } from "../../api/posts.api";
import { getImageUrl } from "../../api/client";
import { pauseAllFeedVideos } from "../../media/feedVideoPlayback";
import { pickActiveAndPreloadVideoIds } from "../../utils/feedVideoVisibility";
import { useAuth } from "../../context/AuthContext";

type Params = {
  MemberPosts: {
    userId: number;
    username?: string;
    name?: string;
    profileImage?: string | null;
  };
};

/**
 * Full paginated member posts timeline — reuses feed PostCard interactions.
 * Does not alter Home Feed ranking.
 */
export function MemberPostsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<Params, "MemberPosts">>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user: authUser } = useAuth();
  const { userId, username, name, profileImage } = route.params;
  const identifier = username || userId;

  const authorName = name ?? "Member";
  const authorAvatar = getImageUrl(profileImage ?? null);
  const [commentPost, setCommentPost] = useState<PostCardData | null>(null);
  const [likesPost, setLikesPost] = useState<PostCardData | null>(null);
  const [sharePost, setSharePost] = useState<PostSharePayload | null>(null);
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null);
  const [preloadMediaId, setPreloadMediaId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const cardsRef = useRef<PostCardData[]>([]);

  const {
    items,
    total,
    hasMore,
    canViewPosts,
    loading,
    loadingMore,
    error,
    reload,
    loadMore,
    updatePost
  } = useMemberPosts(identifier, true, 12);

  const { toggleLike, addLike, toggleSave } = useFeedInteractions(updatePost);

  useFocusEffect(
    useCallback(() => {
      return () => {
        pauseAllFeedVideos();
      };
    }, [])
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
    minimumViewTime: 120
  }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item: PostCardData; isViewable: boolean }> }) => {
      const { activeId, preloadId } = pickActiveAndPreloadVideoIds(
        viewableItems,
        cardsRef.current
      );
      setActiveMediaId(activeId);
      setPreloadMediaId(preloadId);
    }
  ).current;

  const cards = useMemo(
    () => items.map((p) => memberPostToCardData(p, authorName, authorAvatar)),
    [items, authorName, authorAvatar]
  );
  cardsRef.current = cards;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  const renderItem = useCallback(
    ({ item }: { item: PostCardData }) => (
      <PostCard
        post={{
          ...item,
          isMediaActive: item.id === activeMediaId,
          isMediaPreload: item.id === preloadMediaId
        }}
        onMenuPress={
          authUser?.id != null && item.authorUserId === authUser.id
            ? undefined
            : () => {
                trackFeedAction("post_report", Number(item.id), { source: "member_posts" });
                promptReportPost(Number(item.id));
              }
        }
        onActivateMedia={(postId) => {
          setActiveMediaId(postId);
          setPreloadMediaId((prev) => (prev === postId ? null : prev));
        }}
        onDoubleTap={() => addLike(item.id, item)}
        onLikePress={() => toggleLike(item.id, item)}
        onLikeCountPress={() => setLikesPost(item)}
        onCommentPress={() => setCommentPost(item)}
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
    [activeMediaId, preloadMediaId, addLike, toggleLike, toggleSave, authUser?.id]
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {authorName}&apos;s Posts
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            {total} {total === 1 ? "post" : "posts"}
          </Text>
        </View>
      </View>

      {!canViewPosts ? (
        <View style={styles.centered}>
          <Ionicons name="lock-closed-outline" size={36} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Private account</Text>
          <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
            Connect to view this member&apos;s posts.
          </Text>
        </View>
      ) : loading && cards.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error && cards.length === 0 ? (
        <View style={styles.centered}>
          <Text style={{ color: colors.error }}>{error}</Text>
          <Pressable onPress={() => void reload()} style={{ marginTop: spacing.md }}>
            <Text style={{ color: colors.primary, fontWeight: "700" }}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="images-outline" size={36} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Posts Yet</Text>
              <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                This member hasn&apos;t shared anything yet.
              </Text>
            </View>
          }
          onEndReached={() => {
            if (hasMore && !loadingMore) void loadMore();
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ padding: spacing.lg }}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          removeClippedSubviews
          maxToRenderPerBatch={8}
          windowSize={7}
          initialNumToRender={6}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl, flexGrow: 1 }}
        />
      )}

      {commentPost ? (
        <CommentSheet
          visible
          postId={Number(commentPost.id)}
          postTitle={commentPost.title}
          onClose={() => setCommentPost(null)}
          onCommentCountChange={(count) => updatePost(commentPost.id, { commentCount: count })}
        />
      ) : null}

      <LikesBottomSheet
        visible={likesPost != null}
        target={likesPost ? { type: "post", id: Number(likesPost.id) } : null}
        onClose={() => setLikesPost(null)}
        onUserPress={(liker: PostLiker) => {
          setLikesPost(null);
          if (liker.isCurrentUser) navigation.navigate("Profile");
          else navigation.navigate("MemberProfile", { userId: liker.userId });
        }}
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
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm
  },
  backBtn: { padding: spacing.sm },
  title: { fontSize: 17, fontWeight: "800" },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.sm
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", marginTop: spacing.sm },
  emptyBody: { fontSize: 14, textAlign: "center", lineHeight: 20 }
});
