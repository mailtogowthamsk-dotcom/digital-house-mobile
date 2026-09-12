import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { fonts } from "../../theme/fonts";
import { spacing, radius } from "../../theme/spacing";
import { cardShadow } from "../../theme/shadows";

type Props = {
  totalPosts?: number;
  onMyPostsPress: () => void;
  onMyActivityPress: () => void;
};

export function ProfileContentLinks({
  totalPosts = 0,
  onMyPostsPress,
  onMyActivityPress
}: Props) {
  const { colors, mode } = useTheme();

  const s = useMemo(
    () =>
      StyleSheet.create({
        section: { marginBottom: spacing.lg },
        sectionTitle: {
          fontFamily: fonts.semiBold,
          fontSize: 13,
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
          minHeight: 112,
          backgroundColor: colors.surface,
          borderRadius: radius.xl,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.lg,
          ...cardShadow(mode)
        },
        tilePressed: { backgroundColor: colors.surfaceElevated },
        icon: {
          width: 40,
          height: 40,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: spacing.sm,
          backgroundColor: mode === "dark" ? colors.surfaceElevated : colors.primary + "14"
        },
        title: {
          fontFamily: fonts.semiBold,
          fontSize: 16,
          fontWeight: "600",
          color: colors.text
        },
        sub: {
          marginTop: 4,
          fontFamily: fonts.regular,
          fontSize: 13,
          color: colors.textSecondary,
          lineHeight: 18
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

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Your content</Text>
      <View style={s.row}>
        {tiles.map((tile) => (
          <Pressable
            key={tile.key}
            style={({ pressed }) => [s.tile, pressed && s.tilePressed]}
            onPress={tile.onPress}
            accessibilityRole="button"
            accessibilityLabel={tile.title}
          >
            <View style={s.icon}>
              <Ionicons name={tile.icon} size={18} color={colors.primary} />
            </View>
            <Text style={s.title}>{tile.title}</Text>
            <Text style={s.sub} numberOfLines={1}>
              {tile.sub}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
