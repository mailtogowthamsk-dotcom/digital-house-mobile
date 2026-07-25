/**
 * Premium post author row — padded header; media breaks out below.
 */

import React, { memo, useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AvatarImage } from "../ui/AvatarImage";
import { useTheme } from "../../theme/ThemeContext";
import { typography } from "../../theme/typography";
import { feedAvatarRing } from "../../theme/feedStyles";

type Props = {
  userName: string;
  authorUsername?: string | null;
  userAvatarUri?: string | null;
  timeAgo: string;
  communityTag?: string;
  audience?: string;
  isVerified?: boolean;
  isTrending?: boolean;
  onAuthorPress?: () => void;
  onMenuPress?: () => void;
};

function privacyIcon(audience?: string): keyof typeof Ionicons.glyphMap {
  const a = (audience || "").toLowerCase();
  if (a.includes("private") || a.includes("only me")) return "lock-closed-outline";
  if (a.includes("friend") || a.includes("connection")) return "people-outline";
  return "globe-outline";
}

function PostHeaderInner({
  userName,
  authorUsername,
  userAvatarUri,
  timeAgo,
  communityTag,
  audience,
  isVerified = false,
  isTrending = false,
  onAuthorPress,
  onMenuPress
}: Props) {
  const { colors, mode } = useTheme();

  const s = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingTop: 18,
          paddingBottom: 14,
          gap: 12
        },
        avatarOuter: {
          borderRadius: 999,
          padding: 2,
          backgroundColor: colors.surface,
          ...feedAvatarRing(mode)
        },
        textCol: { flex: 1, minWidth: 0, gap: 5 },
        nameRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          maxWidth: "100%"
        },
        name: {
          ...typography.feedUsername,
          color: colors.text,
          flexShrink: 1
        },
        metaRow: {
          flexDirection: "row",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 6
        },
        time: {
          ...typography.feedMeta,
          color: colors.textMuted,
          fontWeight: "500"
        },
        handle: {
          fontSize: 12,
          fontWeight: "500",
          color: colors.textMuted
        },
        chip: {
          paddingHorizontal: 9,
          paddingVertical: 3,
          borderRadius: 999,
          backgroundColor: mode === "dark" ? "rgba(37,99,235,0.18)" : "rgba(37,99,235,0.08)",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: mode === "dark" ? "rgba(37,99,235,0.28)" : "rgba(37,99,235,0.14)"
        },
        chipText: {
          fontSize: 11,
          fontWeight: "600",
          color: colors.primary,
          letterSpacing: 0.1
        },
        privacyChip: {
          flexDirection: "row",
          alignItems: "center",
          gap: 3,
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 999,
          backgroundColor: mode === "dark" ? "rgba(148,163,184,0.14)" : "rgba(148,163,184,0.12)"
        },
        privacyText: {
          fontSize: 11,
          fontWeight: "500",
          color: colors.textSecondary
        },
        menuBtn: {
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: "center",
          justifyContent: "center"
        },
        menuBtnPressed: {
          backgroundColor: mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)"
        },
        trending: {
          flexDirection: "row",
          alignItems: "center",
          gap: 3,
          paddingHorizontal: 7,
          paddingVertical: 3,
          borderRadius: 999,
          backgroundColor: mode === "dark" ? "rgba(234,88,12,0.2)" : "rgba(234,88,12,0.1)"
        },
        trendingText: {
          fontSize: 10,
          fontWeight: "700",
          color: colors.accent
        }
      }),
    [colors, mode]
  );

  return (
    <View style={s.row}>
      <Pressable
        onPress={onAuthorPress}
        disabled={!onAuthorPress}
        hitSlop={6}
        accessibilityRole={onAuthorPress ? "button" : undefined}
        accessibilityLabel={onAuthorPress ? `View ${userName}'s profile` : undefined}
      >
        <View style={s.avatarOuter}>
          <AvatarImage
            uri={userAvatarUri}
            name={userName}
            size={48}
            placeholderColor={mode === "dark" ? "#1E3A5F" : "#EFF6FF"}
            textColor={colors.primary}
          />
        </View>
      </Pressable>

      <View style={s.textCol}>
        <Pressable
          onPress={onAuthorPress}
          disabled={!onAuthorPress}
          style={{ alignSelf: "flex-start", maxWidth: "100%" }}
          hitSlop={4}
        >
          <View style={s.nameRow}>
            <Text style={s.name} numberOfLines={1}>
              {userName}
            </Text>
            {isVerified ? (
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
            ) : null}
          </View>
          {authorUsername ? (
            <Text style={s.handle} numberOfLines={1}>
              @{authorUsername}
            </Text>
          ) : null}
        </Pressable>

        <View style={s.metaRow}>
          <Text style={s.time}>{timeAgo}</Text>
          {communityTag ? (
            <View style={s.chip}>
              <Text style={s.chipText} numberOfLines={1}>
                {communityTag}
              </Text>
            </View>
          ) : null}
          {audience ? (
            <View style={s.privacyChip}>
              <Ionicons name={privacyIcon(audience)} size={11} color={colors.textSecondary} />
              <Text style={s.privacyText} numberOfLines={1}>
                {audience}
              </Text>
            </View>
          ) : null}
          {isTrending ? (
            <View style={s.trending}>
              <Ionicons name="flame" size={11} color={colors.accent} />
              <Text style={s.trendingText}>Hot</Text>
            </View>
          ) : null}
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [s.menuBtn, pressed && s.menuBtnPressed]}
        onPress={onMenuPress}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Post options"
      >
        <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

export const PostHeader = memo(PostHeaderInner);
