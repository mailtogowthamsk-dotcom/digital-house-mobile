import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import type { SummaryLine } from "../../features/notifications/notificationPresentation";
import type { NotificationCategory } from "../../api/notifications.api";

type Props = {
  lines: SummaryLine[];
  onSelectCategory?: (category: NotificationCategory) => void;
};

function lineIcon(category: NotificationCategory): keyof typeof Ionicons.glyphMap {
  switch (category) {
    case "MESSAGES":
      return "chatbubble-ellipses";
    case "MATRIMONY":
      return "heart";
    case "SOCIAL":
      return "people";
    case "COMMUNITY":
      return "megaphone";
    default:
      return "information-circle";
  }
}

export function NotificationSummaryStrip({ lines, onSelectCategory }: Props) {
  const { colors } = useTheme();

  const s = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          marginHorizontal: spacing.lg,
          marginBottom: spacing.md,
          padding: spacing.md,
          borderRadius: radius.lg,
          backgroundColor: colors.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border
        },
        title: {
          fontSize: 11,
          fontWeight: "800",
          letterSpacing: 0.8,
          textTransform: "uppercase",
          color: colors.textMuted,
          marginBottom: spacing.sm
        },
        chip: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: radius.full,
          backgroundColor: colors.surfaceElevated,
          marginRight: spacing.sm
        },
        chipCount: {
          minWidth: 22,
          height: 22,
          borderRadius: 11,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.primary
        },
        chipCountText: { fontSize: 11, fontWeight: "800", color: colors.white },
        chipLabel: { fontSize: 13, fontWeight: "600", color: colors.text }
      }),
    [colors]
  );

  if (!lines.length) return null;

  return (
    <View style={s.wrap}>
      <Text style={s.title}>Activity summary</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {lines.map((line) => (
          <Pressable
            key={line.category}
            style={s.chip}
            onPress={() => onSelectCategory?.(line.category)}
          >
            <View style={s.chipCount}>
              <Text style={s.chipCountText}>{line.count > 9 ? "9+" : line.count}</Text>
            </View>
            <Ionicons name={lineIcon(line.category)} size={16} color={colors.primary} />
            <Text style={s.chipLabel}>
              {line.count} {line.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
