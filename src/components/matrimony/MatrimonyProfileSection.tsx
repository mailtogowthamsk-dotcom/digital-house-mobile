import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";

export type ProfileField = { label: string; value: string | null | undefined };

type Props = {
  title: string;
  icon?: string;
  fields: ProfileField[];
  children?: React.ReactNode;
};

export function MatrimonyProfileSection({ title, icon, fields, children }: Props) {
  const { colors } = useTheme();
  const visible = fields.filter((f) => f.value != null && String(f.value).trim() !== "");

  if (!visible.length && !children) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
        {icon ? `${icon} ` : ""}
        {title}
      </Text>
      {visible.map((f, index) => (
        <View key={`${f.label}-${index}`} style={[styles.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.textMuted }]}>{f.label}</Text>
          <Text style={[styles.value, { color: colors.text }]}>{f.value}</Text>
        </View>
      ))}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.sm + 2,
    marginBottom: spacing.sm
  },
  title: { fontSize: 13, fontWeight: "800", marginBottom: spacing.sm },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 6 },
  label: { width: "38%", fontSize: 12, lineHeight: 17 },
  value: { flex: 1, minWidth: 0, fontSize: 13, fontWeight: "500", lineHeight: 18 }
});
