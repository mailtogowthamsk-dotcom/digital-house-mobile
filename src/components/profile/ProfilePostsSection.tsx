import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  useWindowDimensions,
  Alert
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { typography } from "../../theme/typography";
import { spacing, radius } from "../../theme/spacing";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { ProfilePostGridCard } from "./ProfilePostGridCard";
import { deletePost } from "../../api/posts.api";
import { emitPostDeleted } from "../../utils/postSync";
import type { ProfilePostItem } from "../../api/profile.api";

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
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const gap = spacing.md;
  const horizontalPad = spacing.xl;
  const cardWidth = (width - horizontalPad * 2 - gap) / 2;

  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const s = useMemo(
    () =>
      StyleSheet.create({
        section: { marginBottom: spacing.xl },
        sectionTitleRow: {
          flexDirection: "row",
          alignItems: "center",
          marginBottom: spacing.md,
          gap: spacing.sm
        },
        sectionIconWrap: {
          width: 32,
          height: 32,
          borderRadius: radius.sm,
          backgroundColor: colors.primary + "1A",
          alignItems: "center",
          justifyContent: "center"
        },
        sectionTitle: { ...typography.label, color: colors.text },
        grid: { flexDirection: "row", flexWrap: "wrap", gap },
        gridItem: { width: cardWidth },
        loader: { paddingVertical: spacing.xxl, alignItems: "center" },
        empty: { alignItems: "center", padding: spacing.xxl },
        emptyIconWrap: {
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: colors.surfaceElevated,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: spacing.lg
        },
        emptyTitle: { ...typography.body, color: colors.text, fontWeight: "600", marginBottom: spacing.xs },
        emptyText: { ...typography.bodySmall, color: colors.textMuted, textAlign: "center" },
        errorText: { ...typography.bodySmall, color: colors.error, textAlign: "center", marginBottom: spacing.md },
        retryBtn: {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.lg,
          backgroundColor: colors.primary,
          borderRadius: radius.md
        },
        retryText: { ...typography.buttonSmall, color: colors.white },
        footerLoader: { paddingVertical: spacing.lg },
        deleteError: { ...typography.caption, color: colors.error, marginTop: spacing.sm, textAlign: "center" }
      }),
    [colors, cardWidth, gap]
  );

  const openMenu = useCallback((postId: number) => {
    Alert.alert("Post options", undefined, [
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

  if (loading && items.length === 0) {
    return (
      <View style={s.section}>
        <View style={s.sectionTitleRow}>
          <View style={s.sectionIconWrap}>
            <Ionicons name="grid-outline" size={18} color={colors.primary} />
          </View>
          <Text style={s.sectionTitle}>My Posts</Text>
        </View>
        <ActivityIndicator size="small" color={colors.primary} style={s.loader} />
      </View>
    );
  }

  if (error && items.length === 0) {
    return (
      <View style={s.section}>
        <View style={s.sectionTitleRow}>
          <View style={s.sectionIconWrap}>
            <Ionicons name="grid-outline" size={18} color={colors.primary} />
          </View>
          <Text style={s.sectionTitle}>My Posts</Text>
        </View>
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
        <View style={s.sectionTitleRow}>
          <View style={s.sectionIconWrap}>
            <Ionicons name="grid-outline" size={18} color={colors.primary} />
          </View>
          <Text style={s.sectionTitle}>My Posts</Text>
        </View>
        <View style={s.empty}>
          <View style={s.emptyIconWrap}>
            <Ionicons name="images-outline" size={40} color={colors.textMuted} />
          </View>
          <Text style={s.emptyTitle}>No posts yet</Text>
          <Text style={s.emptyText}>Create a post from the home menu to see it here.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.section}>
      <View style={s.sectionTitleRow}>
        <View style={s.sectionIconWrap}>
          <Ionicons name="grid-outline" size={18} color={colors.primary} />
        </View>
        <Text style={s.sectionTitle}>My Posts</Text>
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
