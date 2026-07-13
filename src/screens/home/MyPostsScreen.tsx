import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useProfilePosts } from "../../hooks/useProfilePosts";
import { ProfilePostGridCard } from "../../components/profile/ProfilePostGridCard";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { deletePost } from "../../api/posts.api";
import { emitPostDeleted } from "../../utils/postSync";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { appAlert } from "../../utils/appAlert";
import type { ProfilePostItem } from "../../api/profile.api";

export function MyPostsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, mode } = useTheme();
  const { width } = useWindowDimensions();
  const gap = spacing.md;
  const pad = spacing.lg;
  const cardWidth = (width - pad * 2 - gap) / 2;

  const {
    items,
    total,
    loading,
    loadingMore,
    error,
    refetch,
    loadMore,
    removePost
  } = useProfilePosts(true);

  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

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
    removePost(postId);
    setDeleteTarget(null);
    try {
      await deletePost(postId);
      emitPostDeleted(postId);
    } catch (e) {
      appAlert("Could not delete", e instanceof Error ? e.message : "Try again");
      void refetch();
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, refetch, removePost]);

  const s = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.background },
        header: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.sm,
          backgroundColor: colors.surface,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
          gap: 8
        },
        backBtn: {
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surfaceElevated
        },
        headerTextCol: { flex: 1, minWidth: 0 },
        headerTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
        headerSub: { marginTop: 1, fontSize: 12, color: colors.textSecondary },
        listContent: {
          paddingHorizontal: pad,
          paddingTop: spacing.md,
          paddingBottom: spacing.xxxl + insets.bottom
        },
        columnWrap: { gap, justifyContent: "space-between" },
        cardWrap: { width: cardWidth, marginBottom: gap },
        empty: {
          alignItems: "center",
          paddingTop: 56,
          paddingHorizontal: spacing.xl
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
        emptyTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
        emptyText: {
          marginTop: spacing.sm,
          textAlign: "center",
          fontSize: 13,
          lineHeight: 20,
          color: colors.textSecondary
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
        center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
        errorText: { color: colors.error, textAlign: "center", marginBottom: spacing.md },
        retryBtn: {
          paddingVertical: 10,
          paddingHorizontal: 18,
          backgroundColor: colors.primary,
          borderRadius: radius.md
        },
        retryText: { color: colors.white, fontWeight: "700" }
      }),
    [colors, mode, cardWidth, gap, pad, insets.bottom]
  );

  const renderItem = useCallback(
    ({ item }: { item: ProfilePostItem }) => (
      <View style={s.cardWrap}>
        <ProfilePostGridCard
          post={item}
          onPress={() => navigation.navigate("PostDetail", { postId: item.postId })}
          onMenuPress={() => openMenu(item.postId)}
        />
      </View>
    ),
    [navigation, openMenu, s.cardWrap]
  );

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + spacing.xs }]}>
        <Pressable style={s.backBtn} onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={s.headerTextCol}>
          <Text style={s.headerTitle}>My Posts</Text>
          <Text style={s.headerSub}>
            {loading && items.length === 0
              ? "Loading…"
              : `${total} ${total === 1 ? "post" : "posts"}`}
          </Text>
        </View>
        <Pressable
          style={s.backBtn}
          onPress={() => navigation.navigate("CreatePost")}
          hitSlop={8}
        >
          <Ionicons name="add" size={22} color={colors.primary} />
        </Pressable>
      </View>

      {loading && items.length === 0 ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error && items.length === 0 ? (
        <View style={s.center}>
          <Text style={s.errorText}>{error.message}</Text>
          <Pressable style={s.retryBtn} onPress={() => void refetch()}>
            <Text style={s.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.postId)}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={items.length > 0 ? s.columnWrap : undefined}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              colors={[colors.primary]}
            />
          }
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.35}
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <Ionicons name="images-outline" size={30} color={colors.primary} />
              </View>
              <Text style={s.emptyTitle}>No posts yet</Text>
              <Text style={s.emptyText}>
                Share an update, job, or listing with the community — it will appear here.
              </Text>
              <Pressable
                style={s.createBtn}
                onPress={() => navigation.navigate("CreatePost")}
              >
                <Ionicons name="add-circle" size={18} color={colors.white} />
                <Text style={s.createBtnText}>Create post</Text>
              </Pressable>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} />
            ) : null
          }
        />
      )}

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
