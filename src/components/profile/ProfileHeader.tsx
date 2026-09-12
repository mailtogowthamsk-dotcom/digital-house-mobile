import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { AvatarImage } from "../ui/AvatarImage";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { typography } from "../../theme/typography";
import { fonts } from "../../theme/fonts";
import { spacing, radius } from "../../theme/spacing";
import { cardShadow } from "../../theme/shadows";
import { formatUsername } from "../../utils/username";

export type ProfileHeaderProps = {
  name: string;
  username?: string | null;
  profile_image: string | null;
  verified: boolean;
  member_since: string;
  communityRole?: string | null;
  location?: string | null;
  completion_percentage?: number;
  stats?: {
    posts: number;
    jobs: number;
    marketplace: number;
  };
  onEditPress?: () => void;
};

function StatCell({
  value,
  label,
  colors
}: {
  value: number;
  label: string;
  colors: { text: string; textSecondary: string };
}) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text
        style={{
          fontFamily: fonts.semiBold,
          fontSize: 18,
          fontWeight: "600",
          color: colors.text,
          letterSpacing: -0.2
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          marginTop: 4,
          fontFamily: fonts.regular,
          fontSize: 12,
          fontWeight: "400",
          color: colors.textSecondary
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export function ProfileHeader({
  name,
  username,
  profile_image,
  verified,
  member_since,
  communityRole,
  location,
  completion_percentage,
  stats,
  onEditPress
}: ProfileHeaderProps) {
  const { colors, mode } = useTheme();
  const showCompletion = completion_percentage != null && completion_percentage < 100;

  const s = useMemo(
    () =>
      StyleSheet.create({
        section: { marginBottom: spacing.lg },
        hero: {
          backgroundColor: colors.surface,
          borderRadius: radius.xl,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          padding: spacing.xl,
          overflow: "hidden",
          ...cardShadow(mode)
        },
        topRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md
        },
        avatarRing: {
          padding: 2,
          borderRadius: 52,
          borderWidth: 1.5,
          borderColor: colors.border,
          backgroundColor: colors.surface
        },
        identity: { flex: 1, minWidth: 0 },
        nameRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6
        },
        name: {
          fontFamily: fonts.semiBold,
          fontSize: 22,
          fontWeight: "600",
          lineHeight: 28,
          color: colors.text,
          flexShrink: 1
        },
        username: {
          fontFamily: fonts.medium,
          fontSize: 14,
          color: colors.primary,
          fontWeight: "500",
          marginTop: 4
        },
        metaLine: {
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          marginTop: 6
        },
        metaText: {
          ...typography.caption,
          color: colors.textSecondary,
          flexShrink: 1
        },
        statsRow: {
          flexDirection: "row",
          alignItems: "center",
          marginTop: spacing.lg,
          paddingTop: spacing.md,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border
        },
        statDivider: {
          width: StyleSheet.hairlineWidth,
          alignSelf: "stretch",
          backgroundColor: colors.border,
          marginVertical: 4
        },
        actions: {
          flexDirection: "row",
          gap: spacing.sm,
          marginTop: spacing.lg
        },
        editBtn: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          minHeight: 52,
          paddingVertical: 12,
          borderRadius: radius.button,
          backgroundColor: colors.primary
        },
        editBtnPressed: { opacity: 0.88 },
        editBtnText: {
          ...typography.buttonSmall,
          color: colors.white,
          fontWeight: "600"
        },
        completion: {
          marginTop: spacing.md,
          padding: spacing.md,
          borderRadius: radius.lg,
          backgroundColor: mode === "dark" ? colors.surfaceElevated : colors.primary + "12"
        },
        completionTop: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10
        },
        completionLabel: {
          fontFamily: fonts.semiBold,
          fontSize: 13,
          fontWeight: "600",
          color: colors.text
        },
        completionPct: {
          fontFamily: fonts.semiBold,
          fontSize: 13,
          fontWeight: "600",
          color: colors.primary
        },
        completionBar: {
          height: 8,
          backgroundColor: colors.border,
          borderRadius: 4,
          overflow: "hidden"
        },
        completionFill: {
          height: "100%",
          backgroundColor: colors.primary,
          borderRadius: 4
        },
        completionHint: {
          fontFamily: fonts.regular,
          fontSize: 12,
          color: colors.textSecondary,
          marginTop: 10,
          lineHeight: 17
        }
      }),
    [colors, mode]
  );

  return (
    <View style={s.section}>
      <View style={s.hero}>
        <View style={s.topRow}>
          <View style={s.avatarRing}>
            <AvatarImage
              uri={profile_image}
              name={name}
              size={84}
              placeholderColor={colors.primary}
              textColor={colors.white}
            />
          </View>
          <View style={s.identity}>
            <View style={s.nameRow}>
              <Text style={s.name} numberOfLines={1}>
                {name}
              </Text>
              {verified ? (
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              ) : null}
            </View>
            {username?.trim() ? (
              <Text style={s.username} numberOfLines={1}>
                {formatUsername(username.trim())}
              </Text>
            ) : null}
            {communityRole ? (
              <View style={s.metaLine}>
                <Ionicons name="ribbon-outline" size={13} color={colors.textMuted} />
                <Text style={s.metaText} numberOfLines={1}>
                  {communityRole}
                </Text>
              </View>
            ) : null}
            {location ? (
              <View style={s.metaLine}>
                <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                <Text style={s.metaText} numberOfLines={1}>
                  {location}
                </Text>
              </View>
            ) : null}
            <View style={s.metaLine}>
              <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
              <Text style={s.metaText}>Joined {member_since}</Text>
            </View>
          </View>
        </View>

        {stats ? (
          <View style={s.statsRow}>
            <StatCell value={stats.posts} label="Posts" colors={colors} />
            <View style={s.statDivider} />
            <StatCell value={stats.jobs} label="Jobs" colors={colors} />
            <View style={s.statDivider} />
            <StatCell value={stats.marketplace} label="Listings" colors={colors} />
          </View>
        ) : null}

        {onEditPress ? (
          <View style={s.actions}>
            <Pressable
              style={({ pressed }) => [s.editBtn, pressed && s.editBtnPressed]}
              onPress={onEditPress}
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
            >
              <Ionicons name="create-outline" size={17} color={colors.white} />
              <Text style={s.editBtnText}>Edit profile</Text>
            </Pressable>
          </View>
        ) : null}

        {showCompletion ? (
          <View style={s.completion}>
            <View style={s.completionTop}>
              <Text style={s.completionLabel}>Profile completeness</Text>
              <Text style={s.completionPct}>{completion_percentage}%</Text>
            </View>
            <View style={s.completionBar}>
              <View
                style={[
                  s.completionFill,
                  { width: `${Math.min(100, completion_percentage!)}%` }
                ]}
              />
            </View>
            <Text style={s.completionHint}>Add missing details so members can find you more easily.</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
