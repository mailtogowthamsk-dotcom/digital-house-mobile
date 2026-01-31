import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing, radius } from "../../theme/spacing";
import { messages } from "../../theme/messages";

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
  isProtected
}: {
  label: string;
  value: string;
  isLast?: boolean;
  isProtected?: boolean;
}) {
  return (
    <View style={[s.row, isLast && s.rowLast]}>
      <View style={s.rowHeader}>
        <Text style={s.rowLabel}>{label}</Text>
        {isProtected && (
          <View style={s.protectedBadge}>
            <Ionicons name="lock-closed" size={12} color={colors.sensitive} />
            <Text style={s.protectedText}>{messages.sensitive.protected}</Text>
          </View>
        )}
      </View>
      <Text style={[s.rowValue, isProtected && s.rowValueProtected]}>{value}</Text>
      {!isLast && <View style={s.divider} />}
    </View>
  );
}

/** Read-only personal info; masked mobile & email with lock icons so sensitive data looks protected. */
export function PersonalInfoSection({ fullName, personal }: PersonalInfoSectionProps) {
  const address = [personal.city, personal.district].filter(Boolean).join(", ") || null;
  const rows: { label: string; value: string; isProtected?: boolean }[] = [
    { label: "Full Name", value: fullName },
    { label: "Mobile", value: personal.masked_mobile, isProtected: true },
    { label: "Email", value: personal.masked_email, isProtected: true },
    { label: "Gender", value: personal.gender ?? "—" },
    { label: "Date of Birth", value: personal.dob ?? "—" },
    ...(personal.blood_group ? [{ label: "Blood Group", value: personal.blood_group }] : []),
    ...(address ? [{ label: "Address", value: address }] : [])
  ];

  return (
    <View style={s.section}>
      <View style={s.sectionTitleRow}>
        <View style={s.sectionIconWrap}>
          <Ionicons name="person-outline" size={18} color={colors.primary} />
        </View>
        <Text style={s.sectionTitle}>Personal Information</Text>
      </View>
      <View style={s.card}>
        {rows.map((r, i) => (
          <Row
            key={r.label}
            label={r.label}
            value={r.value}
            isLast={i === rows.length - 1}
            isProtected={r.isProtected}
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
  rowHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  rowLabel: { ...typography.caption, color: colors.textMuted },
  protectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.sensitiveBg
  },
  protectedText: { ...typography.caption, fontSize: 10, color: colors.sensitive, fontWeight: "600" },
  rowValue: { ...typography.body, color: colors.text },
  rowValueProtected: { color: colors.textSecondary },
  divider: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: colors.border
  }
});
