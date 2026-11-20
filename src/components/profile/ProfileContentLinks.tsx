import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { fonts } from "../../theme/fonts";
import { spacing, radius } from "../../theme/spacing";

type Props = {
  totalPosts?: number;
  onMyPostsPress: () => void;
  onMyActivityPress: () => void;
  onMemberBenefitsPress?: () => void;
  onMyClaimsPress?: () => void;
};

export function ProfileContentLinks({
  totalPosts = 0,
  onMyPostsPress,
  onMyActivityPress,
  onMemberBenefitsPress,
  onMyClaimsPress
}: Props) {
  const { colors, mode } = useTheme();

  const s = useMemo(
    () =>
      StyleSheet.create({
        section: { marginBottom: spacing.lg },
        sectionTitle: {
          fontFamily: fonts.semiBold,
          fontSize: 12,
          fontWeight: "600",
          color: colors.textSecondary,
          letterSpacing: 0.4,
          textTransform: "uppercase",
          marginBottom: spacing.sm,
          marginLeft: 2
        },
        row: { flexDirection: "row", gap: spacing.sm },
        tile: {
          flex: 1,
          minHeight: 64,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.xs,
          backgroundColor: colors.surface,
          borderRadius: radius.xl,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.sm
        },
        tilePressed: { backgroundColor: colors.surfaceElevated },
        icon: {
          width: 32,
          height: 32,
          borderRadius: 10,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: mode === "dark" ? colors.surfaceElevated : colors.primary + "14"
        },
        tileBody: { flex: 1, minWidth: 0 },
        title: {
          fontFamily: fonts.semiBold,
          fontSize: 13,
          fontWeight: "600",
          color: colors.text
        },
        sub: {
          marginTop: 2,
          fontFamily: fonts.regular,
          fontSize: 11,
          color: colors.textSecondary,
          lineHeight: 15
        }
      }),
    [colors, mode]
  );

  const tiles = [
    {
      key: "posts",
      title: "My posts",
      sub: totalPosts > 0 ? `${totalPosts} shared` : "Your community posts",
      icon: "grid-outline" as const,
      onPress: onMyPostsPress
    },
    {
      key: "activity",
      title: "Activity",
      sub: "Saved & liked",
      icon: "heart-outline" as const,
      onPress: onMyActivityPress
    }
  ];

  const benefitTiles: Array<{
    key: string;
    title: string;
    sub: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  }> = [];
  if (onMemberBenefitsPress) {
    benefitTiles.push({
      key: "benefits",
      title: "Member Benefits",
      sub: "Offers from businesses",
      icon: "gift-outline",
      onPress: onMemberBenefitsPress
    });
  }
  if (onMyClaimsPress) {
    benefitTiles.push({
      key: "claims",
      title: "My Claims",
      sub: "Claim codes",
      icon: "ticket-outline",
      onPress: onMyClaimsPress
    });
  }

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle} accessibilityRole="header">Your content</Text>
      {[tiles, benefitTiles].filter((row) => row.length > 0).map((row, index) => (
        <View key={row[0].key} style={[s.row, index > 0 && { marginTop: spacing.sm }]}>
          {row.map((tile) => (
            <Pressable
              key={tile.key}
              style={({ pressed }) => [s.tile, pressed && s.tilePressed]}
              onPress={tile.onPress}
              accessibilityRole="button"
              accessibilityLabel={tile.title}
              accessibilityHint={tile.sub}
            >
              <View style={s.icon}>
                <Ionicons name={tile.icon} size={16} color={colors.primary} />
              </View>
              <View style={s.tileBody}>
                <Text style={s.title}>{tile.title}</Text>
                <Text style={s.sub} numberOfLines={1}>{tile.sub}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}
