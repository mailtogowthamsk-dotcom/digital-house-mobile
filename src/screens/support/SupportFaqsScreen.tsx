import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  LayoutAnimation
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { listSupportFaqs, type SupportFaq } from "../../api/support.api";

export function SupportFaqsScreen() {
  const { colors } = useTheme();
  const [faqs, setFaqs] = useState<SupportFaq[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      setError(null);
      listSupportFaqs()
        .then((data) => {
          if (!cancelled) setFaqs(data);
        })
        .catch((e: unknown) => {
          if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load FAQs");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const grouped = useMemo(() => {
    const map = new Map<string, SupportFaq[]>();
    for (const f of faqs) {
      const key = f.category || "General";
      const arr = map.get(key) ?? [];
      arr.push(f);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [faqs]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      data={grouped}
      keyExtractor={([cat]) => cat}
      ListEmptyComponent={
        <Text style={{ color: colors.textSecondary, textAlign: "center" }}>
          {error ?? "No FAQs yet."}
        </Text>
      }
      renderItem={({ item: [category, items] }) => (
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={[styles.cat, { color: colors.text }]} accessibilityRole="header">{category}</Text>
          {items.map((f) => {
            const open = openId === f.id;
            return (
              <Pressable
                key={f.id}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                style={({ pressed }) => [styles.card, {
                  backgroundColor: open || pressed ? colors.surfaceElevated : colors.surface,
                  borderColor: open ? colors.primary + "45" : colors.border
                }]}
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setOpenId(open ? null : f.id);
                }}
              >
                <View style={styles.qRow}>
                  <Text style={[styles.q, { color: colors.text }]}>{f.question}</Text>
                  <Ionicons
                    name={open ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={colors.textMuted}
                  />
                </View>
                {open ? (
                  <Text style={[styles.a, { color: colors.textSecondary }]}>{f.answer}</Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: {
    width: "100%", maxWidth: 640, alignSelf: "center",
    paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xxl
  },
  cat: { fontSize: 14, fontWeight: "700", marginBottom: 8 },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.sm + 2,
    minHeight: 48,
    justifyContent: "center",
    marginBottom: 6
  },
  qRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  q: { flex: 1, fontSize: 14, fontWeight: "700", lineHeight: 20 },
  a: { marginTop: 10, fontSize: 13, lineHeight: 20 }
});
