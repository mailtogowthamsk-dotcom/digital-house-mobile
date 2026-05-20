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
      <Text style={[styles.title, { color: colors.text }]}>
        {icon ? `${icon} ` : ""}
        {title}
      </Text>
      {visible.map((f) => (
        <View key={f.label} style={[styles.row, { borderBottomColor: colors.border }]}>
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
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm
  },
  title: { fontSize: 14, fontWeight: "800", marginBottom: spacing.sm },
  row: {
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  label: { fontSize: 11, marginBottom: 2 },
  value: { fontSize: 13, fontWeight: "500", lineHeight: 18 }
});
