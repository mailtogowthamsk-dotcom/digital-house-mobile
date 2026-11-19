import React, { memo, useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { timeAgo } from "../../utils/timeAgo";
import { postTypeVisual } from "../../utils/postTypeBadge";
import { PostTypeIconBadge } from "../home/PostTypeIconBadge";

/** Shared shape for own-profile + member-profile grid cards */
export type ProfilePostGridItem = {
  postId: number;
  postType: string;
  title: string;
  mediaUrl: string | null;
  thumbnailUrl?: string | null;
  createdAt: string;
  visibility?: string;
  status?: string;
  counts: { likes: number; comments: number; views?: number };
  isRepost?: boolean;
};

type ProfilePostGridCardProps = {
  post: ProfilePostGridItem;
  onPress: () => void;
  onMenuPress?: () => void;
  /** Dense media tile — less chrome, better for profile grids */
  variant?: "card" | "compact";
};

function ProfilePostGridCardComponent({
  post,
  onPress,
  onMenuPress,
  variant = "card"
}: ProfilePostGridCardProps) {
  const { colors, mode } = useTheme();
  const tint = postTypeVisual(post.postType).color;
  const isVideo = Boolean(post.mediaUrl && /\.(mp4|mov|m4v|webm)(\?|$)/i.test(post.mediaUrl));
  const previewUri = (isVideo ? post.thumbnailUrl : post.mediaUrl) || null;
  const views = post.counts.views;
  const statusLabel =
    post.status === "Closed" ? "Closed" : post.visibility ? post.visibility : null;
  const compact = variant === "compact";

  const s = useMemo(
    () =>
      StyleSheet.create({
        card: {
          flex: 1,
          backgroundColor: colors.surface,
          borderRadius: compact ? radius.sm : radius.md,
          overflow: "hidden",
          borderWidth: compact ? 0 : StyleSheet.hairlineWidth,
          borderColor: colors.border
        },
        cardPressed: { opacity: 0.92 },
        thumbWrap: { position: "relative" },
        thumb: {
          width: "100%",
          aspectRatio: 1,
          backgroundColor: mode === "dark" ? colors.surfaceElevated : "#EFF6FF"
        },
        thumbPlaceholder: { alignItems: "center", justifyContent: "center" },
        typePill: {
          position: "absolute",
          top: compact ? 5 : 8,
          left: compact ? 5 : 8
        },
        menuFab: {
          position: "absolute",
          top: compact ? 4 : 6,
          right: compact ? 4 : 6,
          width: compact ? 24 : 28,
          height: compact ? 24 : 28,
          borderRadius: compact ? 12 : 14,
          backgroundColor: "rgba(15,23,42,0.55)",
          alignItems: "center",
          justifyContent: "center"
        },
        playBadge: {
          ...StyleSheet.absoluteFillObject,
          alignItems: "center",
          justifyContent: "center"
        },
        overlay: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 6,
          paddingTop: 20,
          paddingBottom: 6,
          backgroundColor: "rgba(15,23,42,0.45)"
        },
        overlayTitle: {
          fontSize: 11,
          fontWeight: "700",
          color: "#fff",
          lineHeight: 14
        },
        overlayStats: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginTop: 3
        },
        overlayStat: { flexDirection: "row", alignItems: "center", gap: 2 },
        overlayStatText: { fontSize: 10, fontWeight: "700", color: "#fff" },
        body: { paddingHorizontal: 8, paddingVertical: 7 },
        title: {
          fontSize: 12,
          fontWeight: "700",
          color: colors.text,
          lineHeight: 15
        },
        stats: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 6,
          marginTop: 5
        },
        stat: { flexDirection: "row", alignItems: "center", gap: 2 },
        statText: { fontSize: 10, fontWeight: "600", color: colors.textSecondary },
        footer: {
          marginTop: 5,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 4
        },
        meta: { fontSize: 10, color: colors.textMuted, flex: 1 },
        status: { fontSize: 9, fontWeight: "700", color: colors.textMuted },
        statusClosed: { color: colors.error }
      }),
    [colors, mode, compact]
  );

  const media = (
    <View style={s.thumbWrap}>
      {previewUri ? (
        <>
          <Image
            source={{ uri: previewUri }}
            style={s.thumb}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={previewUri}
          />
          {isVideo ? (
            <View style={s.playBadge} pointerEvents="none">
              <Ionicons name="play-circle" size={compact ? 28 : 36} color="#fff" />
            </View>
          ) : null}
        </>
      ) : post.mediaUrl ? (
        <View style={[s.thumb, s.thumbPlaceholder, { backgroundColor: "#0f172a" }]}>
          <Ionicons name="play-circle" size={compact ? 28 : 36} color="#fff" />
        </View>
      ) : (
        <View style={[s.thumb, s.thumbPlaceholder]}>
          <Ionicons name="document-text-outline" size={compact ? 26 : 30} color={tint} />
        </View>
      )}
      <View style={s.typePill}>
        <PostTypeIconBadge postType={post.postType} onDark size={compact ? 20 : 22} />
      </View>
      {post.isRepost ? (
        <View
          style={{
            position: "absolute",
            left: compact ? 5 : 8,
            bottom: compact ? 28 : 8,
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: "rgba(15,23,42,0.6)",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Ionicons name="repeat" size={11} color="#fff" />
        </View>
      ) : null}
      {onMenuPress ? (
        <Pressable style={s.menuFab} onPress={onMenuPress} hitSlop={8}>
          <Ionicons name="ellipsis-horizontal" size={compact ? 12 : 14} color="#fff" />
        </Pressable>
      ) : null}
      {compact ? (
        <View style={s.overlay} pointerEvents="none">
          <Text style={s.overlayTitle} numberOfLines={1}>
            {post.title}
          </Text>
          <View style={s.overlayStats}>
            <View style={s.overlayStat}>
              <Ionicons name="heart" size={10} color="#fff" />
              <Text style={s.overlayStatText}>{post.counts.likes}</Text>
            </View>
            <View style={s.overlayStat}>
              <Ionicons name="chatbubble" size={10} color="#fff" />
              <Text style={s.overlayStatText}>{post.counts.comments}</Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );

  return (
    <Pressable
      style={({ pressed }) => [s.card, pressed && s.cardPressed]}
      onPress={onPress}
      onLongPress={onMenuPress}
    >
      {media}
      {!compact ? (
        <View style={s.body}>
          <Text style={s.title} numberOfLines={1}>
            {post.title}
          </Text>
          <View style={s.stats}>
            <View style={s.stat}>
              <Ionicons name="heart-outline" size={11} color={colors.textSecondary} />
              <Text style={s.statText}>{post.counts.likes}</Text>
            </View>
            <View style={s.stat}>
              <Ionicons name="chatbubble-outline" size={11} color={colors.textSecondary} />
              <Text style={s.statText}>{post.counts.comments}</Text>
            </View>
            {views != null ? (
              <View style={s.stat}>
                <Ionicons name="eye-outline" size={11} color={colors.textSecondary} />
                <Text style={s.statText}>{views}</Text>
              </View>
            ) : null}
          </View>
          <View style={s.footer}>
            <Text style={s.meta} numberOfLines={1}>
              {timeAgo(post.createdAt)}
            </Text>
            {statusLabel ? (
              <Text style={[s.status, post.status === "Closed" && s.statusClosed]}>{statusLabel}</Text>
            ) : null}
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

export const ProfilePostGridCard = memo(ProfilePostGridCardComponent);
