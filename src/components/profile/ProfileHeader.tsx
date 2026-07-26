import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { AvatarImage } from "../ui/AvatarImage";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { typography } from "../../theme/typography";
import { spacing, radius } from "../../theme/spacing";
import { formatUsername } from "../../utils/username";

export type ProfileHeaderProps = {
  name: string;
  username?: string | null;
  profile_image: string | null;
  verified: boolean;
  member_since: string;
  communityRole?: string | null;
  completion_percentage?: number;
  onEditPress?: () => void;
};

export function ProfileHeader({
  name,
  username,
  profile_image,
  verified,
  member_since,
  communityRole,
  completion_percentage,
  onEditPress
}: ProfileHeaderProps) {
  const { colors } = useTheme();
  const showCompletion =
    completion_percentage != null && completion_percentage < 100;

  const s = useMemo(
    () =>
      StyleSheet.create({
        section: {
          alignItems: "center",
          marginBottom: spacing.xl,
          paddingTop: spacing.sm
        },
        avatarWrap: {
          marginBottom: spacing.md,
          borderRadius: 52,
          borderWidth: 3,
          borderColor: colors.surface,
          backgroundColor: colors.surface,
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 3
        },
        name: {
          ...typography.h1,
          fontSize: 22,
          lineHeight: 28,
          color: colors.text,
          textAlign: "center"
        },
        username: {
          ...typography.bodySmall,
          color: colors.primary,
          fontWeight: "600",
          marginTop: 4
        },
        role: {
          ...typography.caption,
          color: colors.textSecondary,
          marginTop: spacing.xs
        },
        metaRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          gap: spacing.sm,
          marginTop: spacing.md
        },
        chip: {
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          paddingVertical: 5,
          paddingHorizontal: 10,
          borderRadius: radius.full,
          backgroundColor: colors.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border
        },
        chipVerified: {
          backgroundColor: colors.success + "14",
          borderColor: colors.success + "33"
        },
        chipText: {
          ...typography.caption,
          color: colors.textSecondary,
          fontWeight: "600"
        },
        chipTextVerified: { color: colors.success },
        editBtn: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: spacing.sm,
          marginTop: spacing.lg,
          alignSelf: "stretch",
          paddingVertical: 12,
          borderRadius: radius.lg,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border
        },
        editBtnPressed: { backgroundColor: colors.surfaceElevated },
        editBtnText: {
          ...typography.buttonSmall,
          color: colors.text,
          fontWeight: "700"
        },
        completionWrap: {
          width: "100%",
          marginTop: spacing.md
        },
        completionBar: {
          height: 4,
          backgroundColor: colors.border,
          borderRadius: 2,
          overflow: "hidden",
          marginBottom: 6
        },
        completionFill: {
          height: "100%",
          backgroundColor: colors.primary,
          borderRadius: 2
        },
        completionText: {
          ...typography.caption,
          color: colors.textMuted,
          textAlign: "center"
        }
      }),
    [colors]
  );

  return (
    <View style={s.section}>
      <View style={s.avatarWrap}>
        <AvatarImage
          uri={profile_image}
          name={name}
          size={96}
          placeholderColor={colors.primary}
          textColor={colors.white}
        />
      </View>

      <Text style={s.name}>{name}</Text>
      {username?.trim() ? (
        <Text style={s.username}>{formatUsername(username.trim())}</Text>
      ) : null}
      {communityRole ? <Text style={s.role}>{communityRole}</Text> : null}

      <View style={s.metaRow}>
        {verified ? (
          <View style={[s.chip, s.chipVerified]}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={[s.chipText, s.chipTextVerified]}>Verified</Text>
          </View>
        ) : null}
        <View style={s.chip}>
          <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
          <Text style={s.chipText}>Joined {member_since}</Text>
        </View>
      </View>

      {showCompletion ? (
        <View style={s.completionWrap}>
          <View style={s.completionBar}>
            <View
              style={[
                s.completionFill,
                { width: `${Math.min(100, completion_percentage!)}%` }
              ]}
            />
          </View>
          <Text style={s.completionText}>
            Profile {completion_percentage}% complete — tap Edit to finish
          </Text>
        </View>
      ) : null}

      {onEditPress ? (
        <Pressable
          style={({ pressed }) => [s.editBtn, pressed && s.editBtnPressed]}
          onPress={onEditPress}
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
        >
          <Ionicons name="create-outline" size={18} color={colors.text} />
          <Text style={s.editBtnText}>Edit profile</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
