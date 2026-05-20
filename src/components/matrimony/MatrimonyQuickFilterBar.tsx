import React from "react";
import { ScrollView, Pressable, Text, StyleSheet, View } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { spacing } from "../../theme/spacing";
import type { QuickBrowseFilter } from "./matrimonyUi";

type Props = {
  active: QuickBrowseFilter;
  onChange: (f: QuickBrowseFilter) => void;
  onOpenFilters: () => void;
  filtersActive: boolean;
};

const CHIPS: { id: QuickBrowseFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "horoscope", label: "Horoscope" },
  { id: "myDistrict", label: "My district" }
];

export function MatrimonyQuickFilterBar({ active, onChange, onOpenFilters, filtersActive }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {CHIPS.map((c) => {
          const isAct = active === c.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => onChange(c.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: isAct ? "#EFF6FF" : colors.surface,
                  borderColor: isAct ? "#BFDBFE" : colors.border
                }
              ]}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: isAct ? colors.primary : colors.text
                }}
              >
                {c.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={onOpenFilters}
          style={[
            styles.chip,
            {
              backgroundColor: filtersActive ? colors.primary : colors.surface,
              borderColor: filtersActive ? colors.primary : colors.border
            }
          ]}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: filtersActive ? colors.white : colors.text
            }}
          >
            More filters
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.sm },
  scroll: { paddingHorizontal: spacing.lg, gap: 8, flexDirection: "row", alignItems: "center" },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1
  }
});
