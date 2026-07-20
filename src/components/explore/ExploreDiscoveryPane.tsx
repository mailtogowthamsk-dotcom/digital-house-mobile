import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { formatHashtagDisplay } from "../../utils/hashtagParser";

type Props = {
  recent: string[];
  trendingHashtags: Array<{ tag: string; usageCount: number }>;
  suggestedTopics: Array<{ id: string; label: string }>;
  onSelectQuery: (q: string) => void;
  onClearRecent: () => void;
  onRemoveRecent: (q: string) => void;
};

export function ExploreDiscoveryPane({
  recent,
  trendingHashtags,
  suggestedTopics,
  onSelectQuery,
  onClearRecent,
  onRemoveRecent
}: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {recent.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent searches</Text>
            <Pressable onPress={onClearRecent} hitSlop={8}>
              <Text style={[styles.clearText, { color: colors.primary }]}>Clear</Text>
            </Pressable>
          </View>
          {recent.map((q) => (
            <Pressable
              key={q}
              style={styles.recentRow}
              onPress={() => onSelectQuery(q)}
              accessibilityRole="button"
            >
              <Ionicons name="time-outline" size={18} color={colors.textMuted} />
              <Text style={[styles.recentText, { color: colors.text }]} numberOfLines={1}>
                {q}
              </Text>
              <Pressable
                onPress={() => onRemoveRecent(q)}
                hitSlop={10}
                accessibilityLabel={`Remove ${q}`}
              >
                <Ionicons name="close" size={16} color={colors.textMuted} />
              </Pressable>
            </Pressable>
          ))}
        </View>
      ) : null}

      {trendingHashtags.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Trending hashtags</Text>
          <View style={styles.chipWrap}>
            {trendingHashtags.map((h) => (
              <Pressable
                key={h.tag}
                onPress={() => onSelectQuery(`#${h.tag}`)}
                style={[
                  styles.chip,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border }
                ]}
              >
                <Text style={[styles.chipText, { color: colors.primary }]}>
                  {formatHashtagDisplay(h.tag)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Trending hashtags</Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Popular tags will appear here as the community posts.
          </Text>
        </View>
      )}

      {suggestedTopics.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Suggested topics</Text>
          <View style={styles.chipWrap}>
            {suggestedTopics.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => onSelectQuery(t.label)}
                style={[
                  styles.chip,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border }
                ]}
              >
                <Text style={[styles.chipText, { color: colors.text }]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Suggested topics</Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Topic suggestions are coming soon.
          </Text>
        </View>
      )}

      <View style={[styles.idleCard, { backgroundColor: colors.surface }]}>
        <View style={[styles.idleIcon, { backgroundColor: colors.surfaceElevated }]}>
          <Ionicons name="compass-outline" size={28} color={colors.primary} />
        </View>
        <Text style={[styles.idleTitle, { color: colors.text }]}>Discover community posts</Text>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Search by keyword, author name, or #hashtag across titles and descriptions.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: spacing.xl },
  section: { marginBottom: spacing.lg },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: spacing.sm },
  clearText: { fontSize: 13, fontWeight: "600" },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 10
  },
  recentText: { flex: 1, fontSize: 15 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  chipText: { fontSize: 13, fontWeight: "600" },
  hint: { fontSize: 13, lineHeight: 18 },
  idleCard: {
    marginTop: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center"
  },
  idleIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md
  },
  idleTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6, textAlign: "center" }
});
