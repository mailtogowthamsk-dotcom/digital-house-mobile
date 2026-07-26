import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { typography } from "../../theme/typography";
import { spacing } from "../../theme/spacing";
import { AccordionSection } from "./AccordionSection";

export type ProfessionalInfo = {
  education: string | null;
  job_title: string | null;
  company_name: string | null;
  work_location: string | null;
  skills: string | null;
};

type ProfessionalInfoSectionProps = {
  professional: ProfessionalInfo | null | undefined;
};

function Row({
  label,
  value,
  isLast,
  s
}: {
  label: string;
  value: string;
  isLast?: boolean;
  s: ReturnType<typeof StyleSheet.create>;
}) {
  return (
    <View style={[s.row, isLast && s.rowLast]}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
      {!isLast ? <View style={s.divider} /> : null}
    </View>
  );
}

const ROWS: { key: keyof ProfessionalInfo; label: string }[] = [
  { key: "education", label: "Education" },
  { key: "job_title", label: "Job title" },
  { key: "company_name", label: "Company / business" },
  { key: "work_location", label: "Work location" },
  { key: "skills", label: "Skills / category" }
];

const emptyProfessional: ProfessionalInfo = {
  education: null,
  job_title: null,
  company_name: null,
  work_location: null,
  skills: null
};

export function ProfessionalInfoSection({ professional }: ProfessionalInfoSectionProps) {
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

  const pro = professional ?? emptyProfessional;
  const hasAny = ROWS.some(({ key }) => Boolean(pro[key]?.trim()));

  return (
    <AccordionSection
      title="Professional information"
      icon="briefcase-outline"
      defaultExpanded={hasAny}
    >
      {ROWS.map(({ key, label }, i) => (
        <Row
          key={key}
          label={label}
          value={pro[key]?.trim() || "—"}
          isLast={i === ROWS.length - 1}
          s={s}
        />
      ))}
    </AccordionSection>
  );
}
