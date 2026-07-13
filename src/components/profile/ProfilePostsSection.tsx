import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  useWindowDimensions
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { ProfilePostGridCard } from "./ProfilePostGridCard";
import { deletePost } from "../../api/posts.api";
import { emitPostDeleted } from "../../utils/postSync";
import type { ProfilePostItem } from "../../api/profile.api";
import { appAlert } from "../../utils/appAlert";

type ProfilePostsSectionProps = {
  items: ProfilePostItem[];
  loading: boolean;
  loadingMore: boolean;
  error: Error | null;
  onRetry: () => void;
  onPostPress: (postId: number) => void;
  onDeleted: (postId: number) => void;
};

export function ProfilePostsSection({
  items,
  loading,
  loadingMore,
  error,
  onRetry,
  onPostPress,
  onDeleted
}: ProfilePostsSectionProps) {
  const navigation = useNavigation<any>();
  const { colors, mode } = useTheme();
  const { width } = useWindowDimensions();
  const gap = spacing.md;
  /** Parent Profile list already pads with spacing.xl */
  const cardWidth = (width - spacing.xl * 2 - gap) / 2;

  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const s = useMemo(
    () =>
      StyleSheet.create({
        section: { marginBottom: spacing.sm },
        countRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: spacing.md
        },
        countText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
        createLink: { fontSize: 12, fontWeight: "700", color: colors.primary },
        grid: { flexDirection: "row", flexWrap: "wrap", gap },
        gridItem: { width: cardWidth },
        loader: { paddingVertical: spacing.xxl, alignItems: "center" },
        empty: {
          alignItems: "center",
          paddingVertical: spacing.xxl,
          paddingHorizontal: spacing.lg,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border
        },
        emptyIcon: {
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: mode === "dark" ? colors.surfaceElevated : "#EFF6FF",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: spacing.md
        },
        emptyTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
        emptyText: {
          marginTop: spacing.sm,
          fontSize: 13,
          lineHeight: 19,
          color: colors.textSecondary,
          textAlign: "center"
        },
        createBtn: {
          marginTop: spacing.lg,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: colors.primary,
          paddingVertical: 12,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.md
        },
        createBtnText: { fontSize: 14, fontWeight: "700", color: colors.white },
        errorText: {
          fontSize: 13,
          color: colors.error,
          textAlign: "center",
          marginBottom: spacing.md
        },
        retryBtn: {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.lg,
          backgroundColor: colors.primary,
          borderRadius: radius.md
        },
        retryText: { fontSize: 13, fontWeight: "700", color: colors.white },
        deleteError: {
          fontSize: 12,
          color: colors.error,
          marginBottom: spacing.sm,
          textAlign: "center"
        },
        footerLoader: { paddingVertical: spacing.lg }
      }),
    [colors, mode, cardWidth, gap]
  );

  const openMenu = useCallback((postId: number) => {
    appAlert("Post options", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete post",
        style: "destructive",
        onPress: () => setDeleteTarget(postId)
      }
    ]);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (deleteTarget == null) return;
    const postId = deleteTarget;
    setDeleting(true);
    setDeleteError(null);
    onDeleted(postId);
    setDeleteTarget(null);
    try {
      await deletePost(postId);
      emitPostDeleted(postId);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Could not delete post");
      onRetry();
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, onDeleted, onRetry]);

  const goCreate = () => navigation.navigate("CreatePost");

  if (loading && items.length === 0) {
    return (
      <View style={s.section}>
        <ActivityIndicator size="small" color={colors.primary} style={s.loader} />
      </View>
    );
  }

  if (error && items.length === 0) {
    return (
      <View style={s.section}>
        <View style={s.empty}>
          <Text style={s.errorText}>{error.message}</Text>
          <Pressable style={s.retryBtn} onPress={onRetry}>
            <Text style={s.retryText}>Try again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <View style={s.section}>
        <View style={s.empty}>
          <View style={s.emptyIcon}>
            <Ionicons name="images-outline" size={30} color={colors.primary} />
          </View>
          <Text style={s.emptyTitle}>No posts yet</Text>
          <Text style={s.emptyText}>
            Share an update, job, or listing with the community — it will appear here.
          </Text>
          <Pressable style={s.createBtn} onPress={goCreate}>
            <Ionicons name="add-circle" size={18} color={colors.white} />
            <Text style={s.createBtnText}>Create post</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={s.section}>
      <View style={s.countRow}>
        <Text style={s.countText}>
          {items.length} {items.length === 1 ? "post" : "posts"}
        </Text>
        <Pressable onPress={goCreate} hitSlop={8}>
          <Text style={s.createLink}>+ New post</Text>
        </Pressable>
      </View>
      {deleteError ? <Text style={s.deleteError}>{deleteError}</Text> : null}
      <View style={s.grid}>
        {items.map((post) => (
          <View key={post.postId} style={s.gridItem}>
            <ProfilePostGridCard
              post={post}
              onPress={() => onPostPress(post.postId)}
              onMenuPress={() => openMenu(post.postId)}
            />
          </View>
        ))}
      </View>
      <ConfirmDialog
        visible={deleteTarget != null}
        title="Delete post?"
        message="This cannot be undone. The post will be removed from your profile and the community feed."
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        variant="destructive"
      />
    </View>
  );
}
