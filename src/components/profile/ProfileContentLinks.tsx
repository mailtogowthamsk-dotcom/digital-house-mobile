import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";

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
          fontSize: 12,
          fontWeight: "700",
          color: colors.textMuted,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          marginBottom: spacing.sm,
          marginLeft: 2
        },
        row: { flexDirection: "row", gap: spacing.sm },
        tile: {
          flex: 1,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md
        },
        tilePressed: { backgroundColor: colors.surfaceElevated },
        icon: {
          width: 36,
          height: 36,
          borderRadius: 11,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: spacing.sm
        },
        title: { fontSize: 15, fontWeight: "800", color: colors.text },
        sub: { marginTop: 3, fontSize: 12, color: colors.textSecondary, lineHeight: 16 }
      }),
    [colors]
  );

  const tiles = [
    {
      key: "posts",
      title: "My posts",
      sub: totalPosts > 0 ? `${totalPosts} shared` : "Your community posts",
      icon: "grid-outline" as const,
      tint: "#2563EB",
      tintBg: mode === "dark" ? colors.surfaceElevated : "#EFF6FF",
      onPress: onMyPostsPress
    },
    {
      key: "activity",
      title: "Activity",
      sub: "Saved & liked",
      icon: "heart-outline" as const,
      tint: "#DB2777",
      tintBg: mode === "dark" ? colors.surfaceElevated : "#FDF2F8",
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
          >
            <View style={[s.icon, { backgroundColor: tile.tintBg }]}>
              <Ionicons name={tile.icon} size={18} color={tile.tint} />
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
