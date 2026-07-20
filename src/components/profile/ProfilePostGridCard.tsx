import React, { memo, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { timeAgo } from "../../utils/timeAgo";
import type { ProfilePostItem } from "../../api/profile.api";

type ProfilePostGridCardProps = {
  post: ProfilePostItem;
  onPress: () => void;
  onMenuPress: () => void;
};

function typeTint(postType: string): string {
  const t = (postType || "").toUpperCase();
  if (t.includes("JOB")) return "#0D9488";
  if (t.includes("MARKET")) return "#EA580C";
  if (t.includes("MATRIMONY")) return "#E11D48";
  if (t.includes("HELP")) return "#7C3AED";
  return "#2563EB";
}

function ProfilePostGridCardComponent({ post, onPress, onMenuPress }: ProfilePostGridCardProps) {
  const { colors, mode } = useTheme();
  const tint = typeTint(post.postType);

  const s = useMemo(
    () =>
      StyleSheet.create({
        card: {
          flex: 1,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          overflow: "hidden",
          marginBottom: spacing.sm,
          borderWidth: 1,
          borderColor: colors.border
        },
        cardPressed: { opacity: 0.94, borderColor: colors.primary + "55" },
        thumbWrap: { position: "relative" },
        thumb: {
          width: "100%",
          aspectRatio: 1,
          backgroundColor: mode === "dark" ? colors.surfaceElevated : "#EFF6FF"
        },
        thumbPlaceholder: { alignItems: "center", justifyContent: "center" },
        typePill: {
          position: "absolute",
          top: 8,
          left: 8,
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: radius.full,
          backgroundColor: "rgba(15,23,42,0.72)"
        },
        typePillText: { fontSize: 10, fontWeight: "800", color: "#fff" },
        menuFab: {
          position: "absolute",
          top: 6,
          right: 6,
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: "rgba(15,23,42,0.55)",
          alignItems: "center",
          justifyContent: "center"
        },
        body: { padding: spacing.sm + 2 },
        title: {
          fontSize: 13,
          fontWeight: "700",
          color: colors.text,
          lineHeight: 17
        },
        stats: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginTop: spacing.sm
        },
        stat: { flexDirection: "row", alignItems: "center", gap: 3 },
        statText: { fontSize: 11, fontWeight: "600", color: colors.textSecondary },
        footer: {
          marginTop: spacing.sm,
          paddingTop: spacing.xs,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6
        },
        meta: { fontSize: 11, color: colors.textMuted, flex: 1 },
        status: { fontSize: 10, fontWeight: "700", color: colors.textMuted },
        statusClosed: { color: colors.error }
      }),
    [colors, mode]
  );

  return (
    <Pressable
      style={({ pressed }) => [s.card, pressed && s.cardPressed]}
      onPress={onPress}
      onLongPress={onMenuPress}
    >
      <View style={s.thumbWrap}>
        {post.mediaUrl && !/\.(mp4|mov)(\?|$)/i.test(post.mediaUrl) ? (
          <Image source={{ uri: post.mediaUrl }} style={s.thumb} resizeMode="cover" />
        ) : post.mediaUrl ? (
          <View style={[s.thumb, s.thumbPlaceholder, { backgroundColor: "#0f172a" }]}>
            <Ionicons name="play-circle" size={40} color="#fff" />
          </View>
        ) : (
          <View style={[s.thumb, s.thumbPlaceholder]}>
            <Ionicons name="document-text-outline" size={32} color={tint} />
          </View>
        )}
        <View style={s.typePill}>
          <Text style={s.typePillText}>{post.postType}</Text>
        </View>
        <Pressable style={s.menuFab} onPress={onMenuPress} hitSlop={8}>
          <Ionicons name="ellipsis-horizontal" size={14} color="#fff" />
        </Pressable>
      </View>
      <View style={s.body}>
        <Text style={s.title} numberOfLines={2}>
          {post.title}
        </Text>
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
          <Text style={s.meta} numberOfLines={1}>
            {timeAgo(post.createdAt)}
          </Text>
          <Text style={[s.status, post.status === "Closed" && s.statusClosed]}>
            {post.status === "Closed" ? "Closed" : post.visibility}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export const ProfilePostGridCard = memo(ProfilePostGridCardComponent);
