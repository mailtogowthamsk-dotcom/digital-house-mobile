import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { typography } from "../../theme/typography";
import { spacing } from "../../theme/spacing";
import { AccordionSection } from "./AccordionSection";

export type CommunityInfo = {
  kulam?: string | null;
  kulaDeivam?: string | null;
  nativeVillage?: string | null;
  nativeTaluk?: string | null;
  nativeDistrict?: string | null;
};

const ROWS: { key: keyof CommunityInfo; label: string }[] = [
  { key: "kulam", label: "Kulam" },
  { key: "kulaDeivam", label: "Kula deivam" },
  { key: "nativeVillage", label: "Native village" },
  { key: "nativeTaluk", label: "Native taluk" },
  { key: "nativeDistrict", label: "Native district" }
];

function filled(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}

export function CommunityInfoSection({ community }: { community: CommunityInfo | null | undefined }) {
  const { colors } = useTheme();
  const s = useMemo(
    () =>
      StyleSheet.create({
        row: { paddingVertical: spacing.md },
        rowLast: { paddingBottom: spacing.xs },
        rowLabel: {
          ...typography.caption,
          color: colors.textMuted,
          fontWeight: "600",
          marginBottom: 3
        },
        rowValue: { ...typography.bodySmall, color: colors.text, fontWeight: "500" },
        divider: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.border
        }
      }),
    [colors]
  );

  const rows = ROWS.map(({ key, label }) => ({ label, value: filled(community?.[key]) })).filter(
    (row): row is { label: string; value: string } => row.value != null
  );
  if (!rows.length) return null;

  return (
    <AccordionSection title="Community details" icon="people-outline" defaultExpanded>
      {rows.map((row, i) => (
        <View key={row.label} style={[s.row, i === rows.length - 1 && s.rowLast]}>
          <Text style={s.rowLabel}>{row.label}</Text>
          <Text style={s.rowValue}>{row.value}</Text>
          {i < rows.length - 1 ? <View style={s.divider} /> : null}
        </View>
      ))}
    </AccordionSection>
  );
}
