import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { typography } from "../../theme/typography";
import { spacing, radius } from "../../theme/spacing";

export type AccordionSectionProps = {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  defaultExpanded?: boolean;
  children: React.ReactNode;
};

export function AccordionSection({
  title,
  icon = "person-outline",
  defaultExpanded = false,
  children
}: AccordionSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const { colors } = useTheme();
  const s = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          marginBottom: spacing.md,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          overflow: "hidden",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border
        },
        header: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 14,
          paddingHorizontal: spacing.md
        },
        headerPressed: { backgroundColor: colors.surfaceElevated },
        titleRow: { flexDirection: "row", alignItems: "center", flex: 1, gap: spacing.sm },
        iconWrap: {
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: colors.primary + "14",
          alignItems: "center",
          justifyContent: "center"
        },
        title: {
          ...typography.bodySmall,
          fontWeight: "700",
          color: colors.text,
          flex: 1
        },
        content: {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.sm
        }
      }),
    [colors]
  );

  return (
    <View style={s.wrap}>
      <Pressable
        style={({ pressed }) => [s.header, pressed ? s.headerPressed : null]}
        onPress={() => setExpanded((e) => !e)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View style={s.titleRow}>
          <View style={s.iconWrap}>
            <Ionicons name={icon} size={16} color={colors.primary} />
          </View>
          <Text style={s.title}>{title}</Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.textMuted}
          />
        </View>
      </Pressable>
      {expanded ? <View style={s.content}>{children}</View> : null}
    </View>
  );
}
