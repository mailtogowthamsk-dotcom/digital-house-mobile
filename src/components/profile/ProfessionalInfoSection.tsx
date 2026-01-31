import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing, radius } from "../../theme/spacing";

export type ProfessionalInfo = {
  education: string | null;
  job_title: string | null;
  company_name: string | null;
  work_location: string | null;
  skills: string | null;
};

type ProfessionalInfoSectionProps = {
  professional: ProfessionalInfo;
};

function Row({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
  return (
    <View style={[s.row, isLast && s.rowLast]}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
      {!isLast && <View style={s.divider} />}
    </View>
  );
}

const ROWS: { key: keyof ProfessionalInfo; label: string }[] = [
  { key: "education", label: "Education" },
  { key: "job_title", label: "Job Title" },
  { key: "company_name", label: "Company / Business" },
  { key: "work_location", label: "Work Location" },
  { key: "skills", label: "Skills / Category" }
];

/** Read-only professional info. Card with section icon and row dividers. */
export function ProfessionalInfoSection({ professional }: ProfessionalInfoSectionProps) {
  return (
    <View style={s.section}>
      <View style={s.sectionTitleRow}>
        <View style={s.sectionIconWrap}>
          <Ionicons name="briefcase-outline" size={18} color={colors.primary} />
        </View>
        <Text style={s.sectionTitle}>Professional Information</Text>
      </View>
      <View style={s.card}>
        {ROWS.map(({ key, label }, i) => (
          <Row
            key={key}
            label={label}
            value={professional[key] ?? "—"}
            isLast={i === ROWS.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  section: { marginBottom: spacing.xl },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md, gap: spacing.sm },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: "rgba(37, 99, 235, 0.1)",
    alignItems: "center",
    justifyContent: "center"
  },
  sectionTitle: { ...typography.label, color: colors.text },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2
  },
  row: { paddingVertical: spacing.md },
  rowLast: { paddingBottom: spacing.sm },
  rowLabel: { ...typography.caption, color: colors.textMuted, marginBottom: 2 },
  rowValue: { ...typography.body, color: colors.text },
  divider: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: colors.border
  }
});
