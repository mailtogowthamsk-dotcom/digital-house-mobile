import React, { memo, useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AvatarImage } from "../ui/AvatarImage";
import { useTheme } from "../../theme/ThemeContext";
import { spacing } from "../../theme/spacing";
import { timeAgo } from "../../utils/timeAgo";
import type { PostLiker } from "../../api/posts.api";

export type LikerRowProps = {
  liker: PostLiker;
  onPress: (liker: PostLiker) => void;
};

function LikerRowInner({ liker, onPress }: LikerRowProps) {
  const { colors, mode } = useTheme();
  const displayName = liker.isCurrentUser ? "You" : liker.fullName;
  const subtitle = liker.isCurrentUser
    ? liker.username
      ? `@${liker.username}`
      : "Liked by you"
    : liker.username
      ? `@${liker.username}`
      : timeAgo(liker.likedAt);

  const s = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          minHeight: 64,
          gap: spacing.md
        },
        rowPressed: { backgroundColor: mode === "dark" ? "#1A2332" : "#F8FAFC" },
        textCol: { flex: 1, minWidth: 0 },
        nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
        name: {
          fontSize: 16,
          fontWeight: liker.isCurrentUser ? "700" : "600",
          color: colors.text,
          flexShrink: 1
        },
        subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
        heart: { marginLeft: 4 }
      }),
    [colors, mode, liker.isCurrentUser]
  );

  return (
    <Pressable
      style={({ pressed }) => [s.row, pressed && s.rowPressed]}
      onPress={() => onPress(liker)}
      accessibilityRole="button"
      accessibilityLabel={`${displayName}${liker.username ? `, @${liker.username}` : ""}`}
    >
      <AvatarImage
        uri={liker.profilePhoto}
        name={liker.fullName}
        size={48}
        placeholderColor={mode === "dark" ? "#1E3A5F" : "#EFF6FF"}
        textColor={colors.primary}
      />
      <View style={s.textCol}>
        <View style={s.nameRow}>
          <Text style={s.name} numberOfLines={1}>
            {displayName}
          </Text>
          {liker.isVerified ? (
            <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
          ) : null}
          {liker.isCurrentUser ? (
            <Ionicons name="heart" size={14} color="#E91E63" style={s.heart} />
          ) : null}
        </View>
        {subtitle ? (
          <Text style={s.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

export const LikerRow = memo(LikerRowInner);
