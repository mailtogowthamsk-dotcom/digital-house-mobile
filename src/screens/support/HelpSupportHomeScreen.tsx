import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { getSupportHome } from "../../api/support.api";

const ROUTE_BY_ID: Record<string, string> = {
  faqs: "SupportFaqs",
  guides: "SupportGuides",
  contact: "SupportContact",
  bug: "SupportCreateTicket",
  feature: "SupportCreateTicket",
  question: "SupportCreateTicket",
  tickets: "SupportMyTickets"
};

const ICON_BY_ID: Record<string, keyof typeof Ionicons.glyphMap> = {
  faqs: "help-circle-outline",
  guides: "book-outline",
  contact: "call-outline",
  bug: "bug-outline",
  feature: "bulb-outline",
  question: "chatbubble-ellipses-outline",
  tickets: "list-outline"
};

const TYPE_BY_ID: Record<string, string> = {
  bug: "BUG",
  feature: "FEATURE",
  question: "QUESTION"
};

export function HelpSupportHomeScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<
    Array<{ id: string; title: string; subtitle: string }>
  >([]);
  const [openCount, setOpenCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSupportHome();
      setSections(data.sections ?? []);
      setOpenCount(data.openTicketCount ?? 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load Help & Support");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const groups = [
    { label: "Get help", items: sections.filter(({ id }) => ["faqs", "guides", "contact"].includes(id)) },
    { label: "Support tickets", items: sections.filter(({ id }) => TYPE_BY_ID[id] || id === "tickets") }
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} colors={[colors.primary]} />}
    >
      {loading && sections.length === 0 ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} accessibilityLabel="Loading support options" />
      ) : null}
      {error ? (
        <View style={[styles.feedback, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="cloud-offline-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.feedbackText, { color: colors.text }]}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={load}
            style={({ pressed }) => [
              styles.retry,
              { backgroundColor: colors.surfaceElevated },
              pressed && styles.pressed
            ]}
          >
            <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {groups.map(({ label, items }) => items.length > 0 ? (
        <View key={label} style={styles.group}>
          <Text style={[styles.groupTitle, { color: colors.text }]} accessibilityRole="header">{label}</Text>
          <View style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {items.map((item, index) => {
              const openTickets = item.id === "tickets" ? openCount : 0;
              return (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [
                    styles.row,
                    index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                    pressed && { backgroundColor: colors.surfaceElevated }
                  ]}
                  accessibilityRole="button"
                  onPress={() => {
                    const route = ROUTE_BY_ID[item.id];
                    const type = TYPE_BY_ID[item.id];
                    if (type) navigation.navigate(route, { type });
                    else navigation.navigate(route);
                  }}
                >
                  <View style={[styles.iconWrap, { backgroundColor: colors.primary + "14" }]}>
                    <Ionicons name={ICON_BY_ID[item.id]} size={18} color={colors.primary} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
                    {item.subtitle && openTickets === 0 ? (
                      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
                    ) : null}
                  </View>
                  {openTickets > 0 ? (
                    <Text style={[styles.count, { color: colors.primary, backgroundColor: colors.primary + "16" }]}>
                      {openTickets > 99 ? "99+" : openTickets} open
                    </Text>
                  ) : null}
                  <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg
  },
  loader: { marginTop: spacing.lg },
  group: { gap: spacing.xs },
  groupTitle: { fontSize: 14, fontWeight: "700", marginLeft: 2 },
  groupCard: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 54,
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  rowText: { flex: 1, minWidth: 0 },
  title: { fontSize: 13, fontWeight: "700" },
  subtitle: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  count: { fontSize: 11, fontWeight: "700", borderRadius: 9, paddingHorizontal: 6, paddingVertical: 3 },
  feedback: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth
  },
  feedbackText: { flex: 1, fontSize: 13, lineHeight: 18 },
  retry: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: radius.md },
  retryText: { fontSize: 12, fontWeight: "700" },
  pressed: { opacity: 0.7 }
});
