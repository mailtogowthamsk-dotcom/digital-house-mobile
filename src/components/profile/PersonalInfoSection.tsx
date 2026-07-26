import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { typography } from "../../theme/typography";
import { spacing, radius } from "../../theme/spacing";
import { messages } from "../../theme/messages";
import { AccordionSection } from "./AccordionSection";

export type PersonalInfo = {
  masked_mobile: string;
  masked_email: string;
  gender: string | null;
  dob: string | null;
  blood_group: string | null;
  city: string | null;
  district: string | null;
};

type PersonalInfoSectionProps = {
  fullName: string;
  personal: PersonalInfo;
};

function Row({
  label,
  value,
  isLast,
  isProtected,
  s,
  colors
}: {
  label: string;
  value: string;
  isLast?: boolean;
  isProtected?: boolean;
  s: ReturnType<typeof StyleSheet.create>;
  colors: import("../../theme/ThemeContext").ThemeColors;
}) {
  return (
    <View style={[s.row, isLast && s.rowLast]}>
      <View style={s.rowHeader}>
        <Text style={s.rowLabel}>{label}</Text>
        {isProtected ? (
          <View style={s.protectedBadge}>
            <Ionicons name="lock-closed" size={11} color={colors.sensitive} />
            <Text style={s.protectedText}>{messages.sensitive.protected}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[s.rowValue, isProtected && s.rowValueProtected]}>{value}</Text>
      {!isLast ? <View style={s.divider} /> : null}
    </View>
  );
}

export function PersonalInfoSection({ fullName, personal }: PersonalInfoSectionProps) {
  const { colors } = useTheme();
  const s = useMemo(
    () =>
      StyleSheet.create({
        row: { paddingVertical: spacing.md },
        rowLast: { paddingBottom: spacing.xs },
        rowHeader: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 3
        },
        rowLabel: { ...typography.caption, color: colors.textMuted, fontWeight: "600" },
        protectedBadge: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: radius.sm,
          backgroundColor: colors.sensitiveBg
        },
        protectedText: {
          ...typography.caption,
          fontSize: 10,
          color: colors.sensitive,
          fontWeight: "600"
        },
        rowValue: { ...typography.bodySmall, color: colors.text, fontWeight: "500" },
        rowValueProtected: { color: colors.textSecondary },
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

  const p = personal ?? {
    masked_mobile: "—",
    masked_email: "—",
    gender: null,
    dob: null,
    blood_group: null,
    city: null,
    district: null
  };
  const address = [p.city, p.district].filter(Boolean).join(", ") || null;
  const rows: { label: string; value: string; isProtected?: boolean }[] = [
    { label: "Full name", value: fullName ?? "—" },
    { label: "Mobile", value: p.masked_mobile, isProtected: true },
    { label: "Email", value: p.masked_email, isProtected: true },
    { label: "Gender", value: p.gender ?? "—" },
    { label: "Date of birth", value: p.dob ?? "—" },
    ...(p.blood_group ? [{ label: "Blood group", value: p.blood_group }] : []),
    ...(address ? [{ label: "Location", value: address }] : [])
  ];

  return (
    <AccordionSection title="Personal information" icon="person-outline" defaultExpanded>
      {rows.map((r, i) => (
        <Row
          key={r.label}
          label={r.label}
          value={r.value}
          isLast={i === rows.length - 1}
          isProtected={r.isProtected}
          s={s}
          colors={colors}
        />
      ))}
    </AccordionSection>
  );
}
