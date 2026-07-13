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
        section: { marginBottom: spacing.xl },
        sectionTitle: {
          fontSize: 12,
          fontWeight: "700",
          color: colors.textMuted,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          marginBottom: spacing.md
        },
        card: {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: "hidden"
        },
        row: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          paddingVertical: spacing.md + 2,
          paddingHorizontal: spacing.md,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border
        },
        rowLast: { borderBottomWidth: 0 },
        rowPressed: { backgroundColor: colors.surfaceElevated },
        icon: {
          width: 44,
          height: 44,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center"
        },
        body: { flex: 1, minWidth: 0 },
        title: { fontSize: 15, fontWeight: "700", color: colors.text },
        sub: { marginTop: 2, fontSize: 12, color: colors.textSecondary }
      }),
    [colors]
  );

  const links = [
    {
      key: "posts",
      title: "My Posts",
      sub:
        totalPosts > 0
          ? `${totalPosts} ${totalPosts === 1 ? "post" : "posts"} you’ve shared`
          : "View and manage posts you’ve shared",
      icon: "grid-outline" as const,
      tint: "#2563EB",
      tintBg: mode === "dark" ? colors.surfaceElevated : "#EFF6FF",
      onPress: onMyPostsPress
    },
    {
      key: "activity",
      title: "My Activity",
      sub: "Saved bookmarks and posts you’ve liked",
      icon: "pulse-outline" as const,
      tint: "#7C3AED",
      tintBg: mode === "dark" ? colors.surfaceElevated : "#F5F3FF",
      onPress: onMyActivityPress
    }
  ];

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Content</Text>
      <View style={s.card}>
        {links.map((link, idx) => (
          <Pressable
            key={link.key}
            style={({ pressed }) => [
              s.row,
              idx === links.length - 1 && s.rowLast,
              pressed && s.rowPressed
            ]}
            onPress={link.onPress}
          >
            <View style={[s.icon, { backgroundColor: link.tintBg }]}>
              <Ionicons name={link.icon} size={22} color={link.tint} />
            </View>
            <View style={s.body}>
              <Text style={s.title}>{link.title}</Text>
              <Text style={s.sub} numberOfLines={1}>
                {link.sub}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
