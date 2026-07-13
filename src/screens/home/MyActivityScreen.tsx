import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useProfileActivity } from "../../hooks/useProfileActivity";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { timeAgo } from "../../utils/timeAgo";
import type { ProfileActivityItem } from "../../api/profile.api";

type ActivityFolder = "saved" | "liked";

function postTypeIcon(postType: string): keyof typeof Ionicons.glyphMap {
  const t = (postType || "").toUpperCase();
  if (t.includes("JOB")) return "briefcase-outline";
  if (t.includes("MARKET")) return "cart-outline";
  if (t.includes("MATRIMONY")) return "heart-outline";
  if (t.includes("HELP")) return "hand-left-outline";
  return "document-text-outline";
}

function postTypeColor(postType: string): string {
  const t = (postType || "").toUpperCase();
  if (t.includes("JOB")) return "#0D9488";
  if (t.includes("MARKET")) return "#EA580C";
  if (t.includes("MATRIMONY")) return "#E11D48";
  if (t.includes("HELP")) return "#7C3AED";
  return "#2563EB";
}

export function MyActivityScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, mode } = useTheme();
  const [folder, setFolder] = useState<ActivityFolder>("saved");

  const { items, total, loading, refetch } = useProfileActivity(folder, true);
  const [refreshing, setRefreshing] = useState(false);

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
        toolbar: {
          backgroundColor: colors.surface,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.sm,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border
        },
        segment: {
          flexDirection: "row",
          backgroundColor: colors.surfaceElevated,
          borderRadius: radius.md,
          padding: 3,
          gap: 2
        },
        segmentBtn: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          paddingVertical: 10,
          borderRadius: radius.sm
        },
        segmentBtnActive: {
          backgroundColor: colors.surface,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 2,
          elevation: 1
        },
        segmentText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
        segmentTextActive: { color: colors.primary, fontWeight: "700" },
        listContent: {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.xxxl + insets.bottom
        },
        item: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.md,
          marginBottom: spacing.sm
        },
        itemPressed: { opacity: 0.92, borderColor: colors.primary + "55" },
        typeIcon: {
          width: 48,
          height: 48,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center"
        },
        itemBody: { flex: 1, minWidth: 0 },
        itemTitle: { fontSize: 15, fontWeight: "700", color: colors.text, lineHeight: 20 },
        metaRow: {
          marginTop: 6,
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 6
        },
        metaPill: {
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: radius.full,
          backgroundColor: colors.surfaceElevated
        },
        metaPillText: { fontSize: 11, fontWeight: "600", color: colors.textSecondary },
        statusOpen: { backgroundColor: mode === "dark" ? "#14532D" : "#DCFCE7" },
        statusClosed: {
          backgroundColor: mode === "dark" ? colors.surfaceElevated : "#F1F5F9"
        },
        statusOpenText: { color: mode === "dark" ? "#86EFAC" : "#15803D" },
        statusClosedText: { color: colors.textMuted },
        empty: { alignItems: "center", paddingTop: 56, paddingHorizontal: spacing.xl },
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
        center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl }
      }),
    [colors, mode, insets.bottom]
  );

  const emptyCopy =
    folder === "saved"
      ? {
          title: "Nothing saved yet",
          body: "Bookmark posts from the feed and find them here.",
          icon: "bookmark-outline" as const
        }
      : {
          title: "No liked posts",
          body: "Posts you like will show up here for quick access.",
          icon: "heart-outline" as const
        };

  const renderItem = useCallback(
    ({ item }: { item: ProfileActivityItem }) => {
      const tint = postTypeColor(item.postType);
      const closed = item.status === "Closed";
      return (
        <Pressable
          style={({ pressed }) => [s.item, pressed && s.itemPressed]}
          onPress={() => navigation.navigate("PostDetail", { postId: item.postId })}
        >
          <View
            style={[
              s.typeIcon,
              { backgroundColor: mode === "dark" ? colors.surfaceElevated : tint + "18" }
            ]}
          >
            <Ionicons name={postTypeIcon(item.postType)} size={22} color={tint} />
          </View>
          <View style={s.itemBody}>
            <Text style={s.itemTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={s.metaRow}>
              <View style={s.metaPill}>
                <Text style={s.metaPillText}>{item.postType}</Text>
              </View>
              <View style={s.metaPill}>
                <Text style={s.metaPillText}>{timeAgo(item.createdAt)}</Text>
              </View>
              <View style={[s.metaPill, closed ? s.statusClosed : s.statusOpen]}>
                <Text
                  style={[s.metaPillText, closed ? s.statusClosedText : s.statusOpenText]}
                >
                  {item.status}
                </Text>
              </View>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      );
    },
    [colors.surfaceElevated, colors.textMuted, mode, navigation, s]
  );

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + spacing.xs }]}>
        <Pressable style={s.backBtn} onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={s.headerTextCol}>
          <Text style={s.headerTitle}>My Activity</Text>
          <Text style={s.headerSub}>
            {loading && items.length === 0
              ? "Loading…"
              : `${total} ${folder === "saved" ? "saved" : "liked"}`}
          </Text>
        </View>
      </View>

      <View style={s.toolbar}>
        <View style={s.segment}>
          {(
            [
              ["saved", "Saved", "bookmark-outline"],
              ["liked", "Liked", "heart-outline"]
            ] as const
          ).map(([id, label, icon]) => {
            const active = folder === id;
            return (
              <Pressable
                key={id}
                style={[s.segmentBtn, active && s.segmentBtnActive]}
                onPress={() => setFolder(id)}
              >
                <Ionicons
                  name={icon}
                  size={15}
                  color={active ? colors.primary : colors.textMuted}
                />
                <Text style={[s.segmentText, active && s.segmentTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {loading && items.length === 0 ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.postId)}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <Ionicons name={emptyCopy.icon} size={30} color={colors.primary} />
              </View>
              <Text style={s.emptyTitle}>{emptyCopy.title}</Text>
              <Text style={s.emptyText}>{emptyCopy.body}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
