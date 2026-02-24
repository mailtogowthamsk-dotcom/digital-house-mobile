import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";

/**
 * Settings screen – appearance (light/dark), and more later.
 */
export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { mode, setMode, colors } = useTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + spacing.xxl
        }
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        Appearance
      </Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <OptionRow
          label="Light mode"
          icon="sunny-outline"
          selected={mode === "light"}
          onPress={() => setMode("light")}
          colors={colors}
        />
        <View style={[styles.separator, { backgroundColor: colors.border }]} />
        <OptionRow
          label="Dark mode"
          icon="moon-outline"
          selected={mode === "dark"}
          onPress={() => setMode("dark")}
          colors={colors}
        />
      </View>
    </ScrollView>
  );
}

function OptionRow({
  label,
  icon,
  selected,
  onPress,
  colors
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  onPress: () => void;
  colors: import("../../theme/ThemeContext").ThemeColors;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? colors.surfaceElevated : colors.surface }
      ]}
      onPress={onPress}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.surfaceElevated }]}>
        <Ionicons name={icon as any} size={22} color={colors.primary} />
      </View>
      <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      {selected ? (
        <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: spacing.lg
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs
  },
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: "hidden"
  },
  separator: {
    height: 1,
    marginLeft: 56 + spacing.md
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center"
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500"
  }
});
