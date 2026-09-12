import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { fonts } from "../../theme/fonts";
import { spacing, radius } from "../../theme/spacing";
import { cardShadow } from "../../theme/shadows";

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
  const { colors, mode } = useTheme();
  const s = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          marginBottom: spacing.md,
          backgroundColor: colors.surface,
          borderRadius: radius.xl,
          overflow: "hidden",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          ...cardShadow(mode)
        },
        header: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 56,
          paddingVertical: 14,
          paddingHorizontal: spacing.lg
        },
        headerPressed: { backgroundColor: colors.surfaceElevated },
        titleRow: {
          flexDirection: "row",
          alignItems: "center",
          flex: 1,
          gap: spacing.sm
        },
        iconWrap: {
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: colors.primary + "14",
          alignItems: "center",
          justifyContent: "center"
        },
        title: {
          fontFamily: fonts.semiBold,
          fontSize: 16,
          fontWeight: "600",
          color: colors.text,
          flex: 1
        },
        content: {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.sm
        }
      }),
    [colors, mode]
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
            <Ionicons name={icon} size={18} color={colors.primary} />
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
