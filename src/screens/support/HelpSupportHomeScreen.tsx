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
      setLoading(true);
      void load();
    }, [load])
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <Text style={[styles.hero, { color: colors.text }]}>How can we help?</Text>
      <Text style={[styles.sub, { color: colors.textSecondary }]}>
        FAQs, guides, and support tickets — all in one place.
      </Text>

      {loading && sections.length === 0 ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : null}
      {error ? <Text style={{ color: colors.error, marginBottom: spacing.md }}>{error}</Text> : null}

      {sections.map((s) => (
        <Pressable
          key={s.id}
          style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => {
            const route = ROUTE_BY_ID[s.id];
            if (!route) return;
            if (TYPE_BY_ID[s.id]) {
              navigation.navigate(route, { type: TYPE_BY_ID[s.id] });
            } else {
              navigation.navigate(route);
            }
          }}
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.surfaceElevated }]}>
            <Ionicons
              name={ICON_BY_ID[s.id] ?? "help-outline"}
              size={22}
              color={colors.primary}
            />
          </View>
          <View style={styles.rowText}>
            <Text style={[styles.title, { color: colors.text }]}>{s.title}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {s.id === "tickets" && openCount > 0 ? `${openCount} open` : s.subtitle}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  hero: { fontSize: 24, fontWeight: "800", marginBottom: 6 },
  sub: { fontSize: 14, lineHeight: 20, marginBottom: spacing.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  rowText: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, fontWeight: "700" },
  subtitle: { fontSize: 13, marginTop: 2 }
});
