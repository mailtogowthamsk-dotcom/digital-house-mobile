import React, { memo, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { typography } from "../../theme/typography";
import { spacing, radius } from "../../theme/spacing";
import { timeAgo } from "../../utils/timeAgo";
import type { ProfilePostItem } from "../../api/profile.api";

type ProfilePostGridCardProps = {
  post: ProfilePostItem;
  onPress: () => void;
  onMenuPress: () => void;
};

function ProfilePostGridCardComponent({ post, onPress, onMenuPress }: ProfilePostGridCardProps) {
  const { colors } = useTheme();
  const s = useMemo(
    () =>
      StyleSheet.create({
        card: {
          flex: 1,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          overflow: "hidden",
          marginBottom: spacing.md,
          borderWidth: 1,
          borderColor: colors.border
        },
        thumb: {
          width: "100%",
          aspectRatio: 1,
          backgroundColor: colors.surfaceElevated
        },
        thumbPlaceholder: {
          alignItems: "center",
          justifyContent: "center"
        },
        body: { padding: spacing.sm },
        titleRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.xs },
        title: { ...typography.bodySmall, color: colors.text, fontWeight: "600", flex: 1 },
        menuBtn: { padding: 2 },
        meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
        typeBadge: {
          alignSelf: "flex-start",
          marginTop: spacing.xs,
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 4,
          backgroundColor: colors.primary + "18"
        },
        typeText: { ...typography.caption, color: colors.primary, fontWeight: "600" },
        stats: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: spacing.sm,
          marginTop: spacing.sm
        },
        stat: { flexDirection: "row", alignItems: "center", gap: 3 },
        statText: { ...typography.caption, color: colors.textSecondary },
        footer: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: spacing.xs
        },
        visibility: { ...typography.caption, color: colors.textMuted },
        statusClosed: { color: colors.error }
      }),
    [colors]
  );

  return (
    <Pressable
      style={({ pressed }) => [s.card, pressed && { opacity: 0.92 }]}
      onPress={onPress}
      onLongPress={onMenuPress}
    >
      {post.mediaUrl ? (
        <Image source={{ uri: post.mediaUrl }} style={s.thumb} resizeMode="cover" />
      ) : (
        <View style={[s.thumb, s.thumbPlaceholder]}>
          <Ionicons name="document-text-outline" size={36} color={colors.textMuted} />
        </View>
      )}
      <View style={s.body}>
        <View style={s.titleRow}>
          <Text style={s.title} numberOfLines={2}>
            {post.title}
          </Text>
          <Pressable style={s.menuBtn} onPress={onMenuPress} hitSlop={8}>
            <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
        {post.description ? (
          <Text style={s.meta} numberOfLines={1}>
            {post.description}
          </Text>
        ) : null}
        <View style={s.typeBadge}>
          <Text style={s.typeText}>{post.postType}</Text>
        </View>
        <View style={s.stats}>
          <View style={s.stat}>
            <Ionicons name="heart-outline" size={12} color={colors.textSecondary} />
            <Text style={s.statText}>{post.counts.likes}</Text>
          </View>
          <View style={s.stat}>
            <Ionicons name="chatbubble-outline" size={12} color={colors.textSecondary} />
            <Text style={s.statText}>{post.counts.comments}</Text>
          </View>
          <View style={s.stat}>
            <Ionicons name="eye-outline" size={12} color={colors.textSecondary} />
            <Text style={s.statText}>{post.counts.views}</Text>
          </View>
        </View>
        <View style={s.footer}>
          <Text style={s.meta}>{timeAgo(post.createdAt)}</Text>
          <Text style={[s.visibility, post.status === "Closed" && s.statusClosed]}>
            {post.visibility}
            {post.status === "Closed" ? " · Closed" : ""}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export const ProfilePostGridCard = memo(ProfilePostGridCardComponent);
