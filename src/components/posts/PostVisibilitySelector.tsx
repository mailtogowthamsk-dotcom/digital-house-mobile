import React, { memo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { fonts } from "../../theme/fonts";

export type PostVisibilityChoice = "PUBLIC" | "CONNECTIONS";

type Option = {
  value: PostVisibilityChoice;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const OPTIONS: Option[] = [
  { value: "PUBLIC", title: "Community", icon: "people-outline" },
  { value: "CONNECTIONS", title: "Connections", icon: "link-outline" }
];

type Props = {
  value: PostVisibilityChoice;
  onChange: (value: PostVisibilityChoice) => void;
  disabled?: boolean;
};

/** Compact segmented visibility picker for Create Post. */
function PostVisibilitySelectorInner({ value, onChange, disabled }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.text }]}>Who can see this?</Text>
      <View
        style={[
          styles.track,
          { backgroundColor: colors.surfaceElevated, borderColor: colors.border }
        ]}
      >
        {OPTIONS.map((opt) => {
          const selected = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              disabled={disabled}
              onPress={() => onChange(opt.value)}
              style={({ pressed }) => [
                styles.segment,
                selected && {
                  backgroundColor: colors.surface,
                  borderColor: colors.primary + "55",
                  shadowColor: colors.primary,
                  shadowOpacity: 0.12,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 2
                },
                { opacity: disabled ? 0.5 : pressed ? 0.88 : 1 }
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={opt.title}
            >
              <Ionicons
                name={opt.icon}
                size={16}
                color={selected ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.title,
                  { color: selected ? colors.primary : colors.textSecondary }
                ]}
                numberOfLines={1}
              >
                {opt.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md, marginTop: spacing.xs },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: spacing.sm
  },
  track: {
    flexDirection: "row",
    gap: 4,
    padding: 4,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "transparent",
    paddingHorizontal: spacing.sm
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    fontWeight: "600"
  }
});

export const PostVisibilitySelector = memo(PostVisibilitySelectorInner);
