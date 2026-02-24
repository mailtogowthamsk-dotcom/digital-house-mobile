import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getImageUrl } from "../../api/client";
import { PostMedia } from "./PostMedia";
import { useTheme } from "../../theme/ThemeContext";

export type PostCardData = {
  id: string;
  userName: string;
  userAvatarUri?: string | null;
  timeAgo: string;
  postType: string;
  title: string;
  description: string;
  imageUri?: string | null;
  likeCount: number;
  commentCount: number;
};

type PostCardProps = {
  post: PostCardData;
  onPress?: () => void;
  onViewDetails?: () => void;
};

export function PostCard({ post, onPress, onViewDetails }: PostCardProps) {
  const { colors, mode } = useTheme();
  const s = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 18,
          marginBottom: 14,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 3
        },
        cardPressed: { opacity: 0.98 },
        header: {
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 14
        },
        avatarWrap: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: mode === "dark" ? "#1E3A5F" : "#EFF6FF",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
          overflow: "hidden"
        },
        avatarImg: { width: 44, height: 44, borderRadius: 22 },
        avatarText: {
          fontSize: 18,
          fontWeight: "700",
          color: colors.primary
        },
        headerText: { flex: 1, minWidth: 0 },
        nameRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginBottom: 2
        },
        userName: {
          fontSize: 16,
          fontWeight: "600",
          color: colors.text,
          flex: 1
        },
        verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 2 },
        verifiedText: {
          fontSize: 11,
          fontWeight: "600",
          color: colors.success
        },
        meta: { fontSize: 12, color: colors.textSecondary },
        title: {
          fontSize: 17,
          fontWeight: "600",
          color: colors.text,
          marginBottom: 8
        },
        description: {
          fontSize: 14,
          color: colors.textSecondary,
          lineHeight: 22,
          marginBottom: 14
        },
        bannerWrap: {
          borderRadius: 12,
          overflow: "hidden",
          marginBottom: 14,
          backgroundColor: colors.border
        },
        banner: { width: "100%", height: "100%" },
        footerDivider: {
          height: 1,
          backgroundColor: colors.border,
          marginBottom: 12
        },
        footer: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between"
        },
        footerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
        footerCount: { fontSize: 13, color: colors.textSecondary },
        footerSpacer: { width: 16 },
        viewDetailsBtn: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4
        },
        viewDetailsBtnPressed: { opacity: 0.8 },
        viewDetailsText: {
          fontSize: 14,
          fontWeight: "600",
          color: colors.primary
        }
      }),
    [colors, mode]
  );

  const initial = post.userName.trim().charAt(0).toUpperCase() || "?";

  return (
    <Pressable
      style={({ pressed }) => [s.card, pressed && s.cardPressed]}
      onPress={onPress}
    >
      <View style={s.header}>
        <View style={s.avatarWrap}>
          {getImageUrl(post.userAvatarUri) ? (
            <Image source={{ uri: getImageUrl(post.userAvatarUri)! }} style={s.avatarImg} />
          ) : (
            <Text style={s.avatarText}>{initial}</Text>
          )}
        </View>
        <View style={s.headerText}>
          <View style={s.nameRow}>
            <Text style={s.userName} numberOfLines={1}>
              {post.userName}
            </Text>
            <View style={s.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={s.verifiedText}>Verified</Text>
            </View>
          </View>
          <Text style={s.meta}>
            {post.timeAgo} • {post.postType}
          </Text>
        </View>
      </View>

      <Text style={s.title} numberOfLines={2}>
        {post.title}
      </Text>
      <Text style={s.description} numberOfLines={4}>
        {post.description}
      </Text>

      {post.imageUri ? (
        <View style={s.bannerWrap}>
          <PostMedia mediaUrl={post.imageUri} />
        </View>
      ) : null}

      <View style={s.footerDivider} />
      <View style={s.footer}>
        <View style={s.footerLeft}>
          <Ionicons name="heart-outline" size={20} color={colors.textSecondary} />
          <Text style={s.footerCount}>{post.likeCount}</Text>
          <View style={s.footerSpacer} />
          <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
          <Text style={s.footerCount}>{post.commentCount}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [s.viewDetailsBtn, pressed && s.viewDetailsBtnPressed]}
          onPress={(e) => {
            e.stopPropagation();
            onViewDetails?.();
          }}
        >
          <Text style={s.viewDetailsText}>View Details</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.primary} />
        </Pressable>
      </View>
    </Pressable>
  );
}
