import React, { useMemo } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { MatrimonyHub, MatrimonyHubStatus } from "../../api/matrimony.api";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { PrimaryButton } from "../ui/PrimaryButton";

function statusMeta(status: MatrimonyHubStatus): {
  label: string;
  chipBg: string;
  chipText: string;
  description: string;
  cta: string;
} {
  switch (status) {
    case "APPROVED":
      return {
        label: "Approved",
        chipBg: "#DCFCE7",
        chipText: "#14532D",
        description: "Your matrimony profile is live. Use the Matrimony section to view or update details.",
        cta: "Open Matrimony"
      };
    case "PENDING":
      return {
        label: "Under review",
        chipBg: "#FEF3C7",
        chipText: "#92400E",
        description: "Your application was submitted. Admin is reviewing it — you will be notified when approved.",
        cta: "View status"
      };
    case "RESUBMITTED":
      return {
        label: "Resubmitted",
        chipBg: "#DBEAFE",
        chipText: "#1E3A8A",
        description: "Your corrected profile is with admin again. No action needed until you hear back.",
        cta: "View status"
      };
    case "CHANGES_REQUESTED":
      return {
        label: "Changes requested",
        chipBg: "#FFEDD5",
        chipText: "#9A3412",
        description: "Admin asked for updates. Open Matrimony to fix the requested sections and resubmit.",
        cta: "Continue application"
      };
    case "REJECTED":
      return {
        label: "Needs attention",
        chipBg: "#FEE2E2",
        chipText: "#7F1D1D",
        description: "Your last submission was not approved. Open Matrimony to review admin notes and resubmit.",
        cta: "Fix & resubmit"
      };
    case "DRAFT":
      return {
        label: "Draft in progress",
        chipBg: "#E0E7FF",
        chipText: "#3730A3",
        description: "You started a matrimony profile. Continue in the Matrimony section to finish and submit.",
        cta: "Continue profile"
      };
    default:
      return {
        label: "Not started",
        chipBg: "#F1F5F9",
        chipText: "#475569",
        description:
          "Matrimony profiles are managed in the dedicated Matrimony section — photo, horoscope, preferences, and admin approval.",
        cta: "Start matrimony profile"
      };
  }
}

type Props = {
  hub: MatrimonyHub | null;
  loading?: boolean;
  onOpen: () => void;
};

export function MatrimonyEditProfileCard({ hub, loading, onOpen }: Props) {
  const { colors } = useTheme();
  const status = hub?.status ?? "NOT_STARTED";
  const meta = statusMeta(status);
  const adminNote =
    hub?.pending?.change_request?.comment ??
    hub?.pending?.admin_remarks ??
    null;

  const s = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.surfaceElevated,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.lg,
          marginBottom: spacing.lg
        },
        headerRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          marginBottom: spacing.sm
        },
        title: { fontSize: 16, fontWeight: "700", color: colors.text, flex: 1 },
        chip: {
          alignSelf: "flex-start",
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: radius.full,
          marginBottom: spacing.sm
        },
        chipText: { fontSize: 12, fontWeight: "700" },
        body: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.md },
        note: {
          fontSize: 13,
          color: "#9A3412",
          backgroundColor: "#FFF7ED",
          padding: spacing.md,
          borderRadius: radius.md,
          marginBottom: spacing.md,
          lineHeight: 18
        },
        progressBg: {
          height: 6,
          backgroundColor: colors.border,
          borderRadius: 3,
          overflow: "hidden",
          marginBottom: spacing.xs
        },
        progressFill: { height: "100%", backgroundColor: colors.primary },
        progressLabel: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.md },
        hint: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: spacing.sm,
          backgroundColor: "#EFF6FF",
          padding: spacing.md,
          borderRadius: radius.md,
          marginBottom: spacing.md
        },
        hintText: { flex: 1, fontSize: 12, color: "#1E40AF", lineHeight: 17 }
      }),
    [colors]
  );

  return (
    <View style={s.card}>
      <View style={s.headerRow}>
        <Ionicons name="heart" size={22} color={colors.primary} />
        <Text style={s.title}>Matrimony profile</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
      ) : (
        <>
          <View style={[s.chip, { backgroundColor: meta.chipBg }]}>
            <Text style={[s.chipText, { color: meta.chipText }]}>{meta.label}</Text>
          </View>

          <Text style={s.body}>{meta.description}</Text>

          {adminNote && (status === "CHANGES_REQUESTED" || status === "REJECTED") ? (
            <Text style={s.note}>Admin: {adminNote}</Text>
          ) : null}

          {hub && status !== "APPROVED" && hub.completion_percentage > 0 ? (
            <>
              <View style={s.progressBg}>
                <View style={[s.progressFill, { width: `${Math.min(100, hub.completion_percentage)}%` }]} />
              </View>
              <Text style={s.progressLabel}>{hub.completion_percentage}% complete</Text>
            </>
          ) : null}

          <View style={s.hint}>
            <Ionicons name="information-circle-outline" size={18} color="#2563EB" />
            <Text style={s.hintText}>
              Photo, horoscope, and partner preferences are edited only under Menu → Matrimony (not here). This
              keeps one clear application for admin review.
            </Text>
          </View>

          <PrimaryButton title={meta.cta} onPress={onOpen} />
        </>
      )}
    </View>
  );
}
