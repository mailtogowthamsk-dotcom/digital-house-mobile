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
          letterSpacing: 0.5,
          textTransform: "uppercase",
          marginBottom: spacing.sm,
          marginLeft: 2
        },
        card: {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          overflow: "hidden"
        },
        row: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          paddingVertical: 14,
          paddingHorizontal: spacing.md
        },
        rowBorder: {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border
        },
        rowPressed: { backgroundColor: colors.surfaceElevated },
        icon: {
          width: 40,
          height: 40,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center"
        },
        body: { flex: 1, minWidth: 0 },
        title: { fontSize: 15, fontWeight: "700", color: colors.text },
        sub: { marginTop: 2, fontSize: 12, color: colors.textSecondary, lineHeight: 16 }
      }),
    [colors]
  );

  const links = [
    {
      key: "posts",
      title: "My posts",
      sub:
        totalPosts > 0
          ? `${totalPosts} ${totalPosts === 1 ? "post" : "posts"} shared`
          : "Posts you’ve shared with the community",
      icon: "grid-outline" as const,
      tint: "#2563EB",
      tintBg: mode === "dark" ? colors.surfaceElevated : "#EFF6FF",
      onPress: onMyPostsPress
    },
    {
      key: "activity",
      title: "My activity",
      sub: "Bookmarks and posts you’ve liked",
      icon: "heart-outline" as const,
      tint: "#DB2777",
      tintBg: mode === "dark" ? colors.surfaceElevated : "#FDF2F8",
      onPress: onMyActivityPress
    }
  ];

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Your content</Text>
      <View style={s.card}>
        {links.map((link, idx) => (
          <Pressable
            key={link.key}
            style={({ pressed }) => [
              s.row,
              idx < links.length - 1 && s.rowBorder,
              pressed && s.rowPressed
            ]}
            onPress={link.onPress}
          >
            <View style={[s.icon, { backgroundColor: link.tintBg }]}>
              <Ionicons name={link.icon} size={20} color={link.tint} />
            </View>
            <View style={s.body}>
              <Text style={s.title}>{link.title}</Text>
              <Text style={s.sub} numberOfLines={1}>
                {link.sub}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
