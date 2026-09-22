import React, { memo, useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import {
  formatHelpCategory,
  formatHelpExpiresIn,
  formatHelpUrgency,
  helpLifecycleBadge,
  urgencyBadgeColor
} from "../../constants/helpingHands";

export type HelpCardFields = {
  title: string;
  description?: string | null;
  helpCategory?: string | null;
  helpUrgency?: string | null;
  helpStatus?: string | null;
  helpLocation?: string | null;
  helpExpiresAt?: string | null;
  helpHelperCount?: number | null;
  timeAgo?: string;
};

type Props = {
  help: HelpCardFields;
  onViewHelp?: () => void;
  compact?: boolean;
};

function Chip({
  label,
  bg,
  fg
}: {
  label: string;
  bg: string;
  fg: string;
}) {
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.chipText, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function HelpFeedBlockInner({ help, onViewHelp, compact }: Props) {
  const { colors, mode } = useTheme();
  const category = formatHelpCategory(help.helpCategory);
  const urgency = formatHelpUrgency(help.helpUrgency);
  const urgencyTone = urgencyBadgeColor(help.helpUrgency);
  const lifecycle = helpLifecycleBadge(help.helpStatus, help.helpExpiresAt);
  const expiresLabel = formatHelpExpiresIn(help.helpExpiresAt);
  const helpers = Math.max(0, Number(help.helpHelperCount) || 0);
  const showUrgency =
    help.helpUrgency === "URGENT" || help.helpUrgency === "CRITICAL";

  const s = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
          paddingBottom: spacing.sm,
          gap: 6
        },
        badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 2 },
        title: { fontSize: 16, fontWeight: "800", color: colors.text, lineHeight: 21 },
        metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
        metaText: { fontSize: 12, color: colors.textMuted, flex: 1 },
        helpers: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
        chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
        desc: { fontSize: 13, lineHeight: 18, color: colors.textSecondary },
        actions: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 4
        },
        viewBtn: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          backgroundColor: colors.primary,
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderRadius: radius.md
        },
        viewBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },
        posted: { fontSize: 11, color: colors.textMuted },
        neutralChipBg: mode === "dark" ? colors.surfaceElevated : "#F1F5F9"
      }),
    [colors, mode]
  );

  return (
    <View style={s.wrap}>
      <View style={s.badgeRow}>
        <Chip label={lifecycle.label} bg={lifecycle.bg} fg={lifecycle.text} />
        {showUrgency ? (
          <Chip label={urgency} bg={urgencyTone.bg} fg={urgencyTone.text} />
        ) : null}
      </View>

      <Text style={s.title} numberOfLines={2}>
        {help.title}
      </Text>

      {help.helpLocation ? (
        <View style={s.metaRow}>
          <Ionicons name="location-outline" size={13} color={colors.textMuted} />
          <Text style={s.metaText} numberOfLines={1}>
            {help.helpLocation}
          </Text>
        </View>
      ) : null}

      <View style={s.chips}>
        <Chip label={category} bg={s.neutralChipBg} fg={colors.textSecondary} />
        {helpers > 0 ? (
          <Text style={s.helpers}>
            {helpers} {helpers === 1 ? "helper" : "helpers"}
          </Text>
        ) : null}
      </View>

      {help.description && !compact ? (
        <Text style={s.desc} numberOfLines={2}>
          {help.description}
        </Text>
      ) : null}

      <View style={s.actions}>
        <View style={{ flex: 1, gap: 2 }}>
          {help.timeAgo ? <Text style={s.posted}>Posted {help.timeAgo}</Text> : null}
          {expiresLabel ? (
            <Text style={s.posted} numberOfLines={1}>
              {expiresLabel}
            </Text>
          ) : null}
        </View>
        {onViewHelp ? (
          <Pressable
            onPress={onViewHelp}
            style={({ pressed }) => [s.viewBtn, pressed && { opacity: 0.88 }]}
            accessibilityRole="button"
            accessibilityLabel="View help request"
          >
            <Text style={s.viewBtnText}>View Help</Text>
            <Ionicons name="arrow-forward" size={14} color="#fff" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export const HelpFeedBlock = memo(HelpFeedBlockInner);

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999
  },
  chipText: { fontSize: 11, fontWeight: "600" }
});
