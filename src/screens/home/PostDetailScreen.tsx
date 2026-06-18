import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getPost, likePost, savePost, unsavePost, reportPost } from "../../api/posts.api";
import type { PostDetailResponse } from "../../api/posts.api";
import { getErrorStatus } from "../../api/client";
import { PostMedia } from "../../components/home/PostMedia";
import { AvatarImage } from "../../components/ui/AvatarImage";
import { CommentSheet } from "../../components/feed/CommentSheet";
import { sharePost } from "../../utils/sharePost";
import { timeAgo } from "../../utils/timeAgo";
import { formatPostType } from "../../utils/postMappers";
import { emitPostUpdated } from "../../utils/postSync";
import { hapticLike, hapticSave } from "../../utils/feedHaptics";
import { useTheme } from "../../theme/ThemeContext";
import { typography } from "../../theme/typography";
import { spacing, radius } from "../../theme/spacing";
import { messages } from "../../theme/messages";
import { appAlert } from "../../utils/appAlert";

const HEART_COLOR = "#E91E63";

type PostDetailParams = { postId: number };

export function PostDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ PostDetail: PostDetailParams }, "PostDetail">>();
  const { colors } = useTheme();
  const postId = route.params?.postId;

  const [post, setPost] = useState<PostDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [liking, setLiking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPost = useCallback(async () => {
    if (postId == null) return;
    try {
      const data = await getPost(postId);
      setPost(data);
      setError(null);
    } catch (e) {
      const status = getErrorStatus(e);
      if (status === 401) navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      else if (status === 403) navigation.reset({ index: 0, routes: [{ name: "PendingApproval" }] });
      else setError((e as any)?.response?.data?.message ?? messages.error.generic);
    }
  }, [postId, navigation]);

  const refresh = useCallback(async () => {
    if (postId == null) return;
    setRefreshing(true);
    await loadPost();
    setRefreshing(false);
  }, [postId, loadPost]);

  useEffect(() => {
    if (postId != null) {
      setLoading(true);
      loadPost().finally(() => setLoading(false));
    }
  }, [postId, loadPost]);

  const syncToFeed = useCallback(
    (patch: { likeCount?: number; commentCount?: number; likedByMe?: boolean; savedByMe?: boolean }) => {
      if (postId != null) emitPostUpdated(postId, patch);
    },
    [postId]
  );

  const handleLike = useCallback(async () => {
    if (postId == null || !post || liking) return;
    setLiking(true);

    const prevLiked = post.liked_by_me;
    const prevCount = post.like_count;
    const nextLiked = !prevLiked;

    setPost((p) =>
      p
        ? {
            ...p,
            liked_by_me: nextLiked,
            like_count: Math.max(0, prevCount + (nextLiked ? 1 : -1))
          }
        : null
    );
    void hapticLike();

    try {
      const res = await likePost(postId);
      setPost((p) => (p ? { ...p, like_count: res.like_count, liked_by_me: res.liked } : null));
      syncToFeed({ likeCount: res.like_count, likedByMe: res.liked });
    } catch {
      setPost((p) => (p ? { ...p, liked_by_me: prevLiked, like_count: prevCount } : null));
    } finally {
      setLiking(false);
    }
  }, [postId, post, liking, syncToFeed]);

  const handleSave = useCallback(async () => {
    if (postId == null || !post || saving) return;
    setSaving(true);

    const wasSaved = post.saved_by_me ?? false;
    setPost((p) => (p ? { ...p, saved_by_me: !wasSaved } : null));
    void hapticSave();

    try {
      if (wasSaved) await unsavePost(postId);
      else await savePost(postId);
      syncToFeed({ savedByMe: !wasSaved });
    } catch {
      setPost((p) => (p ? { ...p, saved_by_me: wasSaved } : null));
    } finally {
      setSaving(false);
    }
  }, [postId, post, saving, syncToFeed]);

  const handleShare = useCallback(async () => {
    if (!post || postId == null) return;
    await sharePost({
      postId,
      title: post.title,
      authorName: post.author?.name,
      description: post.description ?? undefined
    });
  }, [post, postId]);

  const handleCommentCountChange = useCallback(
    (count: number) => {
      setPost((p) => (p ? { ...p, comment_count: count } : null));
      syncToFeed({ commentCount: count });
    },
    [syncToFeed]
  );

  const handleReport = useCallback(() => {
    if (postId == null) return;
    appAlert("Report post", "Do you want to report this post for review?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Report",
        style: "destructive",
        onPress: async () => {
          try {
            await reportPost(postId, "Reported by user");
            appAlert("Report submitted", "Thank you. We will review this post.");
          } catch {
            appAlert("Error", "Failed to submit report.");
          }
        }
      }
    ]);
  }, [postId]);

  const s = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        content: { paddingBottom: spacing.xl * 2 },
        center: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: spacing.lg,
          gap: spacing.sm
        },
        errorText: { ...typography.body, color: colors.error, textAlign: "center" },
        retryBtn: {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.lg,
          backgroundColor: colors.primary,
          borderRadius: radius.md
        },
        retryText: { ...typography.button, color: colors.white },
        header: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.md,
          paddingTop: spacing.md,
          marginBottom: spacing.sm
        },
        headerText: { flex: 1, minWidth: 0 },
        authorName: { ...typography.h3, fontWeight: "600", color: colors.text },
        metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
        meta: { ...typography.caption, color: colors.textSecondary },
        typePill: {
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: radius.sm,
          backgroundColor: colors.surfaceElevated
        },
        typePillText: { ...typography.caption, fontWeight: "600", color: colors.primary },
        moreBtn: { padding: spacing.xs },
        body: { paddingHorizontal: spacing.md },
        title: { ...typography.h2, color: colors.text, marginBottom: spacing.sm },
        description: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md },
        mediaWrap: { marginBottom: spacing.sm, backgroundColor: colors.border },
        actions: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.sm,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          gap: spacing.xs
        },
        actionBtn: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.sm,
          borderRadius: radius.md
        },
        actionBtnPressed: { opacity: 0.65 },
        actionCount: { ...typography.caption, fontWeight: "600", color: colors.textSecondary },
        actionCountActive: { color: HEART_COLOR },
        commentsTeaser: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md
        },
        commentsTeaserPressed: { opacity: 0.7 },
        commentsTeaserText: { ...typography.body, fontWeight: "500", color: colors.text },
        commentsTeaserHint: { ...typography.caption, color: colors.textSecondary }
      }),
    [colors]
  );

  if (postId == null) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>Invalid post</Text>
      </View>
    );
  }

  if (loading && !post) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error && !post) {
    return (
      <View style={s.center}>
        <Ionicons name="cloud-offline-outline" size={40} color={colors.textSecondary} />
        <Text style={s.errorText}>{error}</Text>
        <Pressable style={s.retryBtn} onPress={loadPost}>
          <Text style={s.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!post) return null;

  const typeLabel = formatPostType(post.post_type);
  const saved = post.saved_by_me ?? false;

  return (
    <>
      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} />
        }
      >
        <View style={s.header}>
          <AvatarImage
            uri={post.author.profile_image}
            name={post.author.name}
            size={44}
            containerStyle={{ marginRight: spacing.sm }}
          />
          <View style={s.headerText}>
            <Text style={s.authorName} numberOfLines={1}>
              {post.author.name}
            </Text>
            <View style={s.metaRow}>
              <Text style={s.meta}>{timeAgo(post.created_at)}</Text>
              <Text style={s.meta}>·</Text>
              <View style={s.typePill}>
                <Text style={s.typePillText}>{typeLabel}</Text>
              </View>
            </View>
          </View>
          <Pressable onPress={handleReport} style={s.moreBtn} hitSlop={8}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={s.body}>
          <Text style={s.title}>{post.title}</Text>
          {post.description ? <Text style={s.description}>{post.description}</Text> : null}
        </View>

        {post.media_url ? (
          <View style={s.mediaWrap}>
            <PostMedia mediaUrl={post.media_url} feedMode />
          </View>
        ) : null}

        <View style={s.actions}>
          <Pressable
            style={({ pressed }) => [s.actionBtn, pressed && s.actionBtnPressed]}
            onPress={handleLike}
            disabled={liking}
          >
            <Ionicons
              name={post.liked_by_me ? "heart" : "heart-outline"}
              size={22}
              color={post.liked_by_me ? HEART_COLOR : colors.textSecondary}
            />
            <Text style={[s.actionCount, post.liked_by_me && s.actionCountActive]}>
              {post.like_count}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [s.actionBtn, pressed && s.actionBtnPressed]}
            onPress={() => setCommentsOpen(true)}
          >
            <Ionicons name="chatbubble-outline" size={22} color={colors.textSecondary} />
            <Text style={s.actionCount}>{post.comment_count}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [s.actionBtn, pressed && s.actionBtnPressed]}
            onPress={handleSave}
            disabled={saving}
          >
            <Ionicons
              name={saved ? "bookmark" : "bookmark-outline"}
              size={22}
              color={saved ? colors.primary : colors.textSecondary}
            />
          </Pressable>

          <Pressable
            style={({ pressed }) => [s.actionBtn, pressed && s.actionBtnPressed]}
            onPress={() => void handleShare()}
          >
            <Ionicons name="share-outline" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [s.commentsTeaser, pressed && s.commentsTeaserPressed]}
          onPress={() => setCommentsOpen(true)}
        >
          <View>
            <Text style={s.commentsTeaserText}>
              {post.comment_count > 0
                ? `View all ${post.comment_count} comment${post.comment_count === 1 ? "" : "s"}`
                : "Be the first to comment"}
            </Text>
            <Text style={s.commentsTeaserHint}>Tap to open comments</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </Pressable>
      </ScrollView>

      <CommentSheet
        visible={commentsOpen}
        postId={postId}
        postTitle={post.title}
        onClose={() => setCommentsOpen(false)}
        onCommentCountChange={handleCommentCountChange}
      />
    </>
  );
}
