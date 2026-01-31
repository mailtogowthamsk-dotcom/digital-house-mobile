import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
  TextInput,
  Alert,
  RefreshControl
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getPost, likePost, addComment, getComments, reportPost } from "../../api/posts.api";
import type { PostDetailResponse, CommentItem } from "../../api/posts.api";
import { getErrorStatus, getImageUrl } from "../../api/client";
import { PostMedia } from "../../components/home/PostMedia";
import { timeAgo } from "../../utils/timeAgo";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing, radius } from "../../theme/spacing";
import { messages } from "../../theme/messages";

type PostDetailParams = { postId: number };

/**
 * Post Detail – view post, like, comment, report.
 * Route param: postId.
 */
export function PostDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ PostDetail: PostDetailParams }, "PostDetail">>();
  const postId = route.params?.postId;

  const [post, setPost] = useState<PostDetailResponse | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentsTotal, setCommentsTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [liking, setLiking] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
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
      else setError((e as any)?.response?.data?.message ?? messages.error.loadProfile);
    }
  }, [postId, navigation]);

  const loadComments = useCallback(async () => {
    if (postId == null) return;
    try {
      const res = await getComments(postId, 1, 50);
      setComments(res.items);
      setCommentsTotal(res.total);
    } catch (_) {}
  }, [postId]);

  const refresh = useCallback(async () => {
    if (postId == null) return;
    setRefreshing(true);
    await Promise.all([loadPost(), loadComments()]);
    setRefreshing(false);
  }, [postId, loadPost, loadComments]);

  useEffect(() => {
    if (postId != null) {
      setLoading(true);
      loadPost().finally(() => setLoading(false));
    }
  }, [postId, loadPost]);

  useEffect(() => {
    if (post) loadComments();
  }, [post?.id, loadComments]);

  const handleLike = useCallback(async () => {
    if (postId == null || !post || liking) return;
    setLiking(true);
    try {
      const res = await likePost(postId);
      setPost((p) => (p ? { ...p, like_count: res.like_count, liked_by_me: res.liked } : null));
    } catch (_) {}
    setLiking(false);
  }, [postId, post, liking]);

  const handleAddComment = useCallback(async () => {
    const body = commentText.trim();
    if (!body || postId == null || submittingComment) return;
    setSubmittingComment(true);
    try {
      const newComment = await addComment(postId, body);
      setComments((prev) => [...prev, newComment]);
      setCommentsTotal((t) => t + 1);
      setCommentText("");
      if (post) setPost({ ...post, comment_count: post.comment_count + 1 });
    } catch (_) {}
    setSubmittingComment(false);
  }, [postId, commentText, post, submittingComment]);

  const handleReport = useCallback(() => {
    if (postId == null) return;
    Alert.alert(
      "Report post",
      "Do you want to report this post for review?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Report",
          style: "destructive",
          onPress: async () => {
            try {
              await reportPost(postId, "Reported by user");
              Alert.alert("Report submitted", "Thank you. We will review this post.");
            } catch (_) {
              Alert.alert("Error", "Failed to submit report.");
            }
          }
        }
      ]
    );
  }, [postId]);

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
        <Text style={s.errorText}>{error}</Text>
        <Pressable style={s.retryBtn} onPress={loadPost}>
          <Text style={s.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!post) return null;

  const initial = post.author.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} />
      }
    >
      <View style={s.header}>
        <View style={s.avatarWrap}>
          {getImageUrl(post.author.profile_image) ? (
            <Image source={{ uri: getImageUrl(post.author.profile_image)! }} style={s.avatar} />
          ) : (
            <Text style={s.avatarText}>{initial}</Text>
          )}
        </View>
        <View style={s.headerText}>
          <Text style={s.authorName} numberOfLines={1}>
            {post.author.name}
          </Text>
          <Text style={s.meta}>
            {timeAgo(post.created_at)} • {post.post_type}
          </Text>
        </View>
        <Pressable onPress={handleReport} style={s.moreBtn} hitSlop={8}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      <Text style={s.title}>{post.title}</Text>
      {post.description ? <Text style={s.description}>{post.description}</Text> : null}
      {post.media_url ? (
        <View style={s.mediaWrap}>
          <PostMedia mediaUrl={post.media_url} height={220} />
        </View>
      ) : null}

      <View style={s.actions}>
        <Pressable
          style={s.actionBtn}
          onPress={handleLike}
          disabled={liking}
        >
          <Ionicons
            name={post.liked_by_me ? "heart" : "heart-outline"}
            size={22}
            color={post.liked_by_me ? colors.error : colors.textSecondary}
          />
          <Text style={s.actionCount}>{post.like_count}</Text>
        </Pressable>
        <View style={s.actionBtn}>
          <Ionicons name="chatbubble-outline" size={22} color={colors.textSecondary} />
          <Text style={s.actionCount}>{post.comment_count}</Text>
        </View>
      </View>

      <View style={s.commentsSection}>
        <Text style={s.commentsTitle}>Comments ({commentsTotal})</Text>
        <View style={s.commentInputRow}>
          <TextInput
            style={s.commentInput}
            placeholder="Add a comment..."
            placeholderTextColor={colors.textMuted}
            value={commentText}
            onChangeText={setCommentText}
            editable={!submittingComment}
          />
          <Pressable
            style={[s.sendBtn, (!commentText.trim() || submittingComment) && s.sendBtnDisabled]}
            onPress={handleAddComment}
            disabled={!commentText.trim() || submittingComment}
          >
            <Text style={s.sendText}>Post</Text>
          </Pressable>
        </View>
        {comments.map((c) => (
          <View key={c.id} style={s.commentRow}>
            <View style={s.commentAvatar}>
              <Text style={s.commentAvatarText}>
                {c.author.name.trim().charAt(0).toUpperCase() || "?"}
              </Text>
            </View>
            <View style={s.commentBody}>
              <Text style={s.commentAuthor}>{c.author.name}</Text>
              <Text style={s.commentText}>{c.body}</Text>
              <Text style={s.commentTime}>{timeAgo(c.created_at)}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.lg },
  errorText: { ...typography.body, color: colors.error, marginBottom: spacing.sm },
  retryBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  retryText: { ...typography.button, color: colors.primary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { fontSize: 18, fontWeight: "700", color: colors.primary },
  headerText: { flex: 1, minWidth: 0 },
  authorName: { ...typography.subhead, fontWeight: "600", color: colors.text },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  moreBtn: { padding: spacing.xs },
  title: { ...typography.title2, color: colors.text, marginBottom: spacing.sm },
  description: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md },
  mediaWrap: { borderRadius: radius.lg, overflow: "hidden", marginBottom: spacing.md, height: 220 },
  media: { width: "100%", height: "100%" },
  actions: { flexDirection: "row", gap: spacing.lg, marginBottom: spacing.lg },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionCount: { ...typography.caption, color: colors.textSecondary },
  commentsSection: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  commentsTitle: { ...typography.subhead, fontWeight: "600", color: colors.text, marginBottom: spacing.sm },
  commentInputRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  commentInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md
  },
  sendBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  sendBtnDisabled: { opacity: 0.5 },
  sendText: { ...typography.button, color: colors.primary },
  commentRow: { flexDirection: "row", marginBottom: spacing.sm },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm
  },
  commentAvatarText: { fontSize: 14, fontWeight: "600", color: colors.primary },
  commentBody: { flex: 1, minWidth: 0 },
  commentAuthor: { ...typography.caption, fontWeight: "600", color: colors.text },
  commentText: { ...typography.body, color: colors.textSecondary },
  commentTime: { ...typography.caption, color: colors.textMuted, marginTop: 2 }
});
