import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getImageUrl } from "../../api/client";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing, radius } from "../../theme/spacing";

export type ProfileHeaderProps = {
  name: string;
  profile_image: string | null;
  verified: boolean;
  member_since: string;
  communityRole?: string | null;
};

/** Profile header: avatar with ring, name, verified pill, member since. Soft gradient background. */
export function ProfileHeader({
  name,
  profile_image,
  verified,
  member_since,
  communityRole
}: ProfileHeaderProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <View style={s.wrapper}>
      <LinearGradient
        colors={["#EFF6FF", "#FFFFFF"]}
        style={s.gradient}
      >
        <View style={s.avatarRing}>
          {getImageUrl(profile_image) ? (
            <Image source={{ uri: getImageUrl(profile_image)! }} style={s.avatar} />
          ) : (
            <View style={s.avatarPlaceholder}>
              <Text style={s.avatarText}>{initial}</Text>
            </View>
          )}
        </View>
        <Text style={s.name}>{name}</Text>
        {communityRole ? <Text style={s.role}>{communityRole}</Text> : null}
        {verified && (
          <View style={s.verifiedPill}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={s.verifiedText}>Verified member</Text>
          </View>
        )}
        <Text style={s.memberSince}>Member since {member_since}</Text>
      </LinearGradient>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.xl,
    borderRadius: radius.lg,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4
  },
  gradient: {
    paddingVertical: spacing.xxl + spacing.lg,
    paddingHorizontal: spacing.xxl,
    alignItems: "center"
  },
  avatarRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.9)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3
  },
  avatar: { width: 92, height: 92, borderRadius: 46 },
  avatarPlaceholder: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: { fontSize: 32, fontWeight: "700", color: colors.white },
  name: { ...typography.h1, color: colors.text, marginBottom: spacing.xs },
  role: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.sm },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    marginBottom: spacing.sm
  },
  verifiedText: { ...typography.caption, color: colors.success, fontWeight: "600" },
  memberSince: { ...typography.caption, color: colors.textMuted }
});
