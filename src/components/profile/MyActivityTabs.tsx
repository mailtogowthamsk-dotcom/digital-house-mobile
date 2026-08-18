import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { messages } from "../../theme/messages";
import type { ProfileActivityItem } from "../../api/profile.api";
import { timeAgo } from "../../utils/timeAgo";
import { postTypeVisual } from "../../utils/postTypeBadge";

export type ActivityTab = "my" | "saved" | "liked";

type MyActivityTabsProps = {
  activeTab: ActivityTab;
  onTabChange: (tab: ActivityTab) => void;
  items: ProfileActivityItem[];
  loading: boolean;
  /** Replaces default list when "My Posts" tab is active */
  myPostsContent?: React.ReactNode;
  onActivityItemPress?: (postId: number) => void;
};

const TABS: {
  id: ActivityTab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: "my", label: "My Posts", icon: "grid-outline" },
  { id: "saved", label: "Saved", icon: "bookmark-outline" },
  { id: "liked", label: "Liked", icon: "heart-outline" }
];

export function MyActivityTabs({
  activeTab,
  onTabChange,
  items,
  loading,
  myPostsContent,
  onActivityItemPress
}: MyActivityTabsProps) {
  const { colors, mode } = useTheme();

  const emptyCopy =
    activeTab === "saved"
      ? {
          title: "Nothing saved yet",
          body: "Bookmark posts from the feed and find them here.",
          icon: "bookmark-outline" as const
        }
      : activeTab === "liked"
        ? {
            title: "No liked posts",
            body: "Posts you like will show up here for quick access.",
            icon: "heart-outline" as const
          }
        : {
            title: "No activity yet",
            body: messages.empty.profileActivity,
            icon: "document-text-outline" as const
          };

  const s = useMemo(
    () =>
      StyleSheet.create({
        section: { marginBottom: spacing.xl },
        header: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: spacing.md
        },
        headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
        iconWrap: {
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: mode === "dark" ? colors.surfaceElevated : "#EFF6FF",
          alignItems: "center",
          justifyContent: "center"
        },
        title: { fontSize: 16, fontWeight: "800", color: colors.text },
        subtitle: { marginTop: 1, fontSize: 12, color: colors.textSecondary },
        segment: {
          flexDirection: "row",
          backgroundColor: colors.surfaceElevated,
          borderRadius: radius.md,
          padding: 3,
          gap: 2,
          marginBottom: spacing.md
        },
        segmentBtn: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          paddingVertical: 9,
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
        segmentText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
        segmentTextActive: { color: colors.primary, fontWeight: "700" },
        list: {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: "hidden"
        },
        loader: { paddingVertical: spacing.xxl },
        empty: { alignItems: "center", paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
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
        item: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border
        },
        itemLast: { borderBottomWidth: 0 },
        itemPressed: { backgroundColor: colors.surfaceElevated },
        typeIcon: {
          width: 44,
          height: 44,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center"
        },
        itemBody: { flex: 1, minWidth: 0 },
        itemTitle: {
          fontSize: 14,
          fontWeight: "700",
          color: colors.text,
          lineHeight: 19
        },
        itemMeta: {
          marginTop: 4,
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 6
        },
        metaPill: {
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: radius.full,
          backgroundColor: colors.surfaceElevated
        },
        metaPillText: { fontSize: 11, fontWeight: "600", color: colors.textSecondary },
        statusOpen: {
          backgroundColor: mode === "dark" ? "#14532D" : "#DCFCE7"
        },
        statusClosed: {
          backgroundColor: mode === "dark" ? colors.surfaceElevated : "#F1F5F9"
        },
        statusOpenText: {
          color: mode === "dark" ? "#86EFAC" : "#15803D"
        },
        statusClosedText: { color: colors.textMuted },
        chevron: { marginLeft: 2 }
      }),
    [colors, mode]
  );

  return (
    <View style={s.section}>
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.iconWrap}>
            <Ionicons name="pulse-outline" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.title}>My Activity</Text>
            <Text style={s.subtitle}>Your posts, bookmarks, and likes</Text>
          </View>
        </View>
      </View>

      <View style={s.segment}>
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              style={[s.segmentBtn, active && s.segmentBtnActive]}
              onPress={() => onTabChange(tab.id)}
            >
              <Ionicons
                name={tab.icon}
                size={14}
                color={active ? colors.primary : colors.textMuted}
              />
              <Text style={[s.segmentText, active && s.segmentTextActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {activeTab === "my" && myPostsContent ? (
        myPostsContent
      ) : (
        <View style={s.list}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} style={s.loader} />
          ) : items.length === 0 ? (
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <Ionicons name={emptyCopy.icon} size={30} color={colors.primary} />
              </View>
              <Text style={s.emptyTitle}>{emptyCopy.title}</Text>
              <Text style={s.emptyText}>{emptyCopy.body}</Text>
            </View>
          ) : (
            items.map((item, index) => {
              const visual = postTypeVisual(item.postType);
              const tint = visual.color;
              const closed = item.status === "Closed";
              return (
                <Pressable
                  key={item.postId}
                  style={({ pressed }) => [
                    s.item,
                    index === items.length - 1 && s.itemLast,
                    pressed && s.itemPressed
                  ]}
                  onPress={() => onActivityItemPress?.(item.postId)}
                >
                  <View
                    style={[
                      s.typeIcon,
                      { backgroundColor: mode === "dark" ? colors.surfaceElevated : tint + "18" }
                    ]}
                  >
                    <Ionicons name={visual.icon} size={20} color={tint} />
                  </View>
                  <View style={s.itemBody}>
                    <Text style={s.itemTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <View style={s.itemMeta}>
                      <View style={s.metaPill}>
                        <Text style={s.metaPillText}>{visual.label}</Text>
                      </View>
                      <View style={s.metaPill}>
                        <Text style={s.metaPillText}>{timeAgo(item.createdAt)}</Text>
                      </View>
                      <View style={[s.metaPill, closed ? s.statusClosed : s.statusOpen]}>
                        <Text
                          style={[
                            s.metaPillText,
                            closed ? s.statusClosedText : s.statusOpenText
                          ]}
                        >
                          {item.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.textMuted}
                    style={s.chevron}
                  />
                </Pressable>
              );
            })
          )}
        </View>
      )}
    </View>
  );
}
