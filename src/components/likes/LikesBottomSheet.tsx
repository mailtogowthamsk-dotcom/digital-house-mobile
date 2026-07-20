import React, { memo, useCallback, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  RefreshControl
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { useLikesList, type LikesTarget } from "../../hooks/useLikesList";
import { LikerRow } from "./LikerRow";
import type { PostLiker } from "../../api/posts.api";
import { Shimmer } from "../ui/Shimmer";

type LikesBottomSheetProps = {
  visible: boolean;
  target: LikesTarget | null;
  title?: string;
  onClose: () => void;
  onUserPress: (liker: PostLiker) => void;
};

function SkeletonRows() {
  const { colors } = useTheme();
  return (
    <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md }}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <Shimmer width={48} height={48} borderRadius={24} />
          <View style={{ flex: 1, gap: 8 }}>
            <Shimmer height={14} borderRadius={6} style={{ width: "55%" }} />
            <Shimmer height={12} borderRadius={6} style={{ width: "35%" }} />
          </View>
        </View>
      ))}
      <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: "center", marginTop: 8 }}>
        Loading likes…
      </Text>
    </View>
  );
}

function LikesBottomSheetInner({
  visible,
  target,
  title = "Likes",
  onClose,
  onUserPress
}: LikesBottomSheetProps) {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    items,
    total,
    loading,
    loadingMore,
    refreshing,
    error,
    hasMore,
    reload,
    loadMore
  } = useLikesList(target, visible && target != null);

  const s = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: "rgba(15, 23, 42, 0.45)",
          justifyContent: "flex-end"
        },
        sheet: {
          backgroundColor: colors.surface,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          maxHeight: "78%",
          minHeight: 320,
          paddingBottom: Math.max(insets.bottom, spacing.md)
        },
        handleWrap: { alignItems: "center", paddingTop: spacing.sm, paddingBottom: spacing.xs },
        handle: {
          width: 40,
          height: 4,
          borderRadius: 2,
          backgroundColor: mode === "dark" ? "#334155" : "#CBD5E1"
        },
        header: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.md,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border
        },
        headerText: { flex: 1 },
        title: { fontSize: 18, fontWeight: "700", color: colors.text },
        subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
        closeBtn: {
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: mode === "dark" ? "#1E293B" : "#F1F5F9"
        },
        empty: {
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: spacing.xxxl,
          paddingHorizontal: spacing.xl,
          gap: spacing.md
        },
        emptyIcon: {
          width: 72,
          height: 72,
          borderRadius: 36,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: mode === "dark" ? "#1E293B" : "#FEE2E2"
        },
        emptyTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
        emptyBody: {
          fontSize: 14,
          color: colors.textSecondary,
          textAlign: "center",
          lineHeight: 20
        },
        errorWrap: { padding: spacing.lg, alignItems: "center", gap: spacing.sm },
        errorText: { color: colors.error, textAlign: "center", fontSize: 14 },
        retry: {
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
          borderRadius: radius.full,
          backgroundColor: colors.primary
        },
        retryText: { color: "#fff", fontWeight: "700", fontSize: 14 },
        footer: { paddingVertical: spacing.md, alignItems: "center" },
        listContent: { paddingBottom: spacing.lg, flexGrow: 1 }
      }),
    [colors, mode, insets.bottom]
  );

  const keyExtractor = useCallback((item: PostLiker) => String(item.userId), []);

  const renderItem = useCallback(
    ({ item }: { item: PostLiker }) => <LikerRow liker={item} onPress={onUserPress} />,
    [onUserPress]
  );

  const onEndReached = useCallback(() => {
    if (hasMore && !loadingMore && !loading) void loadMore();
  }, [hasMore, loadingMore, loading, loadMore]);

  const listEmpty = useMemo(() => {
    if (loading) return <SkeletonRows />;
    if (error) {
      return (
        <View style={s.errorWrap}>
          <Text style={s.errorText}>{error}</Text>
          <Pressable style={s.retry} onPress={() => void reload()}>
            <Text style={s.retryText}>Retry</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={s.empty}>
        <View style={s.emptyIcon}>
          <Ionicons name="heart-outline" size={34} color="#E91E63" />
        </View>
        <Text style={s.emptyTitle}>No likes yet</Text>
        <Text style={s.emptyBody}>Be the first to like this post.</Text>
      </View>
    );
  }, [loading, error, s, reload]);

  const subtitle =
    total > 0 ? `${total} ${total === 1 ? "like" : "likes"}` : "People who liked this";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Dismiss" />
        <View style={s.sheet}>
          <View style={s.handleWrap}>
            <View style={s.handle} />
          </View>
          <View style={s.header}>
            <View style={s.headerText}>
              <Text style={s.title}>{title}</Text>
              <Text style={s.subtitle}>{subtitle}</Text>
            </View>
            <Pressable style={s.closeBtn} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>

          <FlatList
            data={loading && items.length === 0 ? [] : items}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            ListEmptyComponent={listEmpty}
            contentContainerStyle={s.listContent}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.35}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => void reload()} />
            }
            ListFooterComponent={
              loadingMore ? (
                <View style={s.footer}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : null
            }
            initialNumToRender={12}
            windowSize={7}
            maxToRenderPerBatch={10}
            removeClippedSubviews
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </Modal>
  );
}

export const LikesBottomSheet = memo(LikesBottomSheetInner);
