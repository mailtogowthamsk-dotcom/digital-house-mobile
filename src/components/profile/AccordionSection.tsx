import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "../../theme/colors";
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

  return (
    <View style={s.wrap}>
      <Pressable
        style={({ pressed }) => [s.header, pressed ? s.headerPressed : null]}
        onPress={() => setExpanded((e) => !e)}
      >
        <View style={s.titleRow}>
          <Ionicons name={icon} size={22} color={colors.primary} style={s.icon} />
          <Text style={s.title}>{title}</Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={22}
            color={colors.textMuted}
          />
        </View>
      </Pressable>
      {expanded ? <View style={s.content}>{children}</View> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl
  },
  headerPressed: { opacity: 0.9 },
  titleRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  icon: { marginRight: spacing.md },
  title: { ...typography.h3, color: colors.text, flex: 1 },
  content: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xxl
  }
});
