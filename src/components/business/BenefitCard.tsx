import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import type { OwnerBenefit, PublicBenefit } from "../../api/business.api";

function fmtDate(iso: string | null | undefined) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending Approval",
  ACTIVE: "Active",
  REJECTED: "Rejected",
  DISABLED: "Disabled",
  EXPIRED: "Expired",
  CLAIMED: "Claimed",
  USED: "Used"
};

type Props = {
  title: string;
  value: string;
  businessName?: string | null;
  validUntil?: string | null;
  status?: string | null;
  claimStatus?: string | null;
  onPress?: () => void;
  ctaLabel?: string;
};

export function BenefitCard({
  title,
  value,
  businessName,
  validUntil,
  status,
  claimStatus,
  onPress,
  ctaLabel = "View Benefit"
}: Props) {
  const { colors } = useTheme();
  const until = fmtDate(validUntil);

  const s = useMemo(
    () =>
      StyleSheet.create({
        card: {
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          padding: spacing.lg,
          marginBottom: spacing.md
        },
        value: {
          fontSize: 20,
          fontWeight: "800",
          color: colors.primary,
          letterSpacing: 0.2
        },
        title: {
          ...typography.body,
          fontWeight: "700",
          color: colors.text,
          marginTop: 4
        },
        business: {
          ...typography.caption,
          color: colors.textSecondary,
          fontWeight: "600",
          marginTop: spacing.sm
        },
        meta: {
          ...typography.caption,
          color: colors.textMuted,
          marginTop: 4
        },
        footer: {
          marginTop: spacing.md,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between"
        },
        cta: { ...typography.caption, color: colors.primary, fontWeight: "700" },
        status: { ...typography.caption, fontWeight: "700" }
      }),
    [colors]
  );

  const statusText = claimStatus
    ? STATUS_LABEL[claimStatus] ?? claimStatus
    : status
      ? STATUS_LABEL[status] ?? status
      : null;

  const statusColor =
    claimStatus === "USED" || status === "EXPIRED" || status === "DISABLED"
      ? colors.textMuted
      : claimStatus === "CLAIMED" || status === "PENDING"
        ? "#D97706"
        : status === "REJECTED"
          ? colors.error
          : colors.primary;

  const body = (
    <>
      <Text style={s.value}>{value}</Text>
      <Text style={s.title}>{title}</Text>
      {businessName ? <Text style={s.business}>{businessName}</Text> : null}
      {until ? <Text style={s.meta}>Valid until {until}</Text> : null}
      <View style={s.footer}>
        {statusText ? <Text style={[s.status, { color: statusColor }]}>{statusText}</Text> : <View />}
        {onPress ? <Text style={s.cta}>{ctaLabel}</Text> : null}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable style={s.card} onPress={onPress} accessibilityRole="button">
        {body}
      </Pressable>
    );
  }
  return <View style={s.card}>{body}</View>;
}

export function publicBenefitToCardProps(b: PublicBenefit) {
  return {
    title: b.title,
    value: b.value,
    businessName: b.businessName,
    validUntil: b.validUntil,
    claimStatus: b.myClaim?.status ?? null
  };
}

export function ownerBenefitToCardProps(b: OwnerBenefit) {
  return {
    title: b.title,
    value: b.value,
    validUntil: b.validUntil,
    status: b.status
  };
}
