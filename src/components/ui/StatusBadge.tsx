import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing, radius } from "../../theme/spacing";

export type StatusType = "pending" | "approved" | "rejected";

const STATUS_CONFIG: Record<
  StatusType,
  { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }
> = {
  pending: {
    label: "Pending",
    icon: "time-outline",
    color: colors.statusPending,
    bg: colors.warning + "18"
  },
  approved: {
    label: "Approved",
    icon: "checkmark-circle",
    color: colors.statusApproved,
    bg: colors.success + "18"
  },
  rejected: {
    label: "Rejected",
    icon: "close-circle",
    color: colors.statusRejected,
    bg: colors.error + "18"
  }
};

type StatusBadgeProps = {
  status: StatusType;
};

/** Clear status indicator (pending, approved, rejected) – reusable, trust-oriented */
export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <View style={[s.badge, { backgroundColor: config.bg }]}>
      <Ionicons name={config.icon} size={16} color={config.color} />
      <Text style={[s.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full
  },
  text: { ...typography.caption, fontWeight: "600" }
});
