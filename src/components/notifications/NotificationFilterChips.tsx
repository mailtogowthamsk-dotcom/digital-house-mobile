import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { spacing } from "../../theme/spacing";
import type { NotificationCategory } from "../../api/notifications.api";
import { FILTER_TABS } from "../../features/notifications/notificationPresentation";

type Props = {
  active: NotificationCategory;
  countFor: (id: NotificationCategory) => number;
  onChange: (id: NotificationCategory) => void;
};

export function NotificationFilterChips({ active, countFor, onChange }: Props) {
  const { colors } = useTheme();

  return (
    <View accessibilityRole="tablist">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.track}
      >
        {FILTER_TABS.map(({ id, label }) => {
          const selected = active === id;
          const count = countFor(id);
          const textColor = selected ? colors.primary : colors.textSecondary;
          return (
            <Pressable
              key={id}
              onPress={() => onChange(id)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={count > 0 ? `${label}, ${count} unread` : label}
              style={({ pressed }) => [
                styles.tab,
                (selected || pressed) && {
                  backgroundColor: selected ? colors.primary + "14" : colors.surfaceElevated
                }
              ]}
            >
              <Text style={[styles.label, { color: textColor }]}>{label}</Text>
              {count > 0 ? (
                <Text style={[styles.count, { color: colors.primary }]}>{count > 99 ? "99+" : count}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { paddingHorizontal: spacing.md, paddingVertical: 4, gap: 4 },
  tab: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 11
  },
  label: { fontSize: 12, fontWeight: "700" },
  count: { fontSize: 11, fontWeight: "700", fontVariant: ["tabular-nums"] }
});
