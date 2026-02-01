import React from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing, radius } from "../../theme/spacing";

export type ProfileStats = {
  total_posts: number;
  jobs_posted: number;
  marketplace_items: number;
  help_requests: number;
};

const STAT_ITEMS: { key: keyof ProfileStats; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "total_posts", label: "Total Posts", icon: "megaphone-outline" },
  { key: "jobs_posted", label: "Jobs Posted", icon: "briefcase-outline" },
  { key: "marketplace_items", label: "Marketplace", icon: "cart-outline" },
  { key: "help_requests", label: "Helping Hand", icon: "hand-left-outline" }
];

type StatsCardsProps = {
  stats: ProfileStats | null | undefined;
};

const defaultStats: ProfileStats = {
  total_posts: 0,
  jobs_posted: 0,
  marketplace_items: 0,
  help_requests: 0
};

/** Community stats: 2x2 grid, icon in colored circle, soft shadow cards */
export function StatsCards({ stats }: StatsCardsProps) {
  const { width } = useWindowDimensions();
  const padding = spacing.xl * 2;
  const gap = spacing.md;
  const cardSize = (width - padding - gap) / 2;
  const s_ = stats ?? defaultStats;

  return (
    <View style={s.section}>
      <View style={s.sectionTitleRow}>
        <View style={s.sectionIconWrap}>
          <Ionicons name="stats-chart-outline" size={18} color={colors.primary} />
        </View>
        <Text style={s.sectionTitle}>Community Stats</Text>
      </View>
      <View style={s.grid}>
        {STAT_ITEMS.map(({ key, label, icon }) => (
          <View key={key} style={[s.card, { width: cardSize }]}>
            <View style={s.iconWrap}>
              <Ionicons name={icon} size={22} color={colors.primary} />
            </View>
            <Text style={s.value}>{s_[key]}</Text>
            <Text style={s.label} numberOfLines={2}>
              {label}
            </Text>
          </View>
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
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(37, 99, 235, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm
  },
  value: { ...typography.h2, color: colors.text },
  label: { ...typography.caption, color: colors.textSecondary, marginTop: 2, textAlign: "center" }
});
