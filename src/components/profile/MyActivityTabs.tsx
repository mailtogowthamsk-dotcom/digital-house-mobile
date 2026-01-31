import React from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing, radius } from "../../theme/spacing";
import { messages } from "../../theme/messages";
import type { ProfileActivityItem } from "../../api/profile.api";

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export type ActivityTab = "my" | "saved" | "liked";

type MyActivityTabsProps = {
  activeTab: ActivityTab;
  onTabChange: (tab: ActivityTab) => void;
  items: ProfileActivityItem[];
  loading: boolean;
};

const TABS: { id: ActivityTab; label: string }[] = [
  { id: "my", label: "My Posts" },
  { id: "saved", label: "Saved" },
  { id: "liked", label: "Liked" }
];

/** My Activity: pill tabs + list with accent bar; improved empty state */
export function MyActivityTabs({ activeTab, onTabChange, items, loading }: MyActivityTabsProps) {
  return (
    <View style={s.section}>
      <View style={s.sectionTitleRow}>
        <View style={s.sectionIconWrap}>
          <Ionicons name="list-outline" size={18} color={colors.primary} />
        </View>
        <Text style={s.sectionTitle}>My Activity</Text>
      </View>
      <View style={s.tabRow}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.id}
            style={({ pressed }) => [s.tab, activeTab === tab.id && s.tabActive, pressed && s.tabPressed]}
            onPress={() => onTabChange(tab.id)}
          >
            <Text style={[s.tabText, activeTab === tab.id && s.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={s.card}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={s.loader} />
        ) : items.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="document-text-outline" size={40} color={colors.textMuted} />
            </View>
            <Text style={s.emptyTitle}>No activity yet</Text>
            <Text style={s.emptyText}>{messages.empty.profileActivity}</Text>
          </View>
        ) : (
          items.map((item, index) => (
            <View
              key={item.postId}
              style={[s.item, index === items.length - 1 && s.itemLast]}
            >
              <View style={s.itemAccent} />
              <View style={s.itemContent}>
                <Text style={s.itemTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <View style={s.itemMeta}>
                  <Text style={s.itemType}>{item.postType}</Text>
                  <Text style={s.itemDate}>{formatDate(item.createdAt)}</Text>
                  <View style={[s.statusBadge, item.status === "Closed" && s.statusClosed]}>
                    <Text style={s.statusText}>{item.status}</Text>
                  </View>
                </View>
              </View>
            </View>
          ))
        )}
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
  tabRow: { flexDirection: "row", marginBottom: spacing.md, gap: spacing.sm },
  tab: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated
  },
  tabActive: { backgroundColor: colors.primary },
  tabPressed: { opacity: 0.9 },
  tabText: { ...typography.bodySmall, color: colors.textSecondary },
  tabTextActive: { ...typography.bodySmall, color: colors.white, fontWeight: "600" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2
  },
  loader: { padding: spacing.xxl },
  empty: { alignItems: "center", padding: spacing.xxl + spacing.lg },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg
  },
  emptyTitle: { ...typography.body, color: colors.text, fontWeight: "600", marginBottom: spacing.xs },
  emptyText: { ...typography.bodySmall, color: colors.textMuted, textAlign: "center" },
  item: {
    flexDirection: "row",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  itemLast: { borderBottomWidth: 0 },
  itemAccent: {
    width: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginRight: spacing.md
  },
  itemContent: { flex: 1, minWidth: 0 },
  itemTitle: { ...typography.body, color: colors.text, marginBottom: 4 },
  itemMeta: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  itemType: { ...typography.caption, color: colors.textSecondary },
  itemDate: { ...typography.caption, color: colors.textMuted },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.success + "20"
  },
  statusClosed: { backgroundColor: colors.textMuted + "30" },
  statusText: { ...typography.caption, color: colors.text, fontWeight: "600" }
});
