import React, { memo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";

export type PostVisibilityChoice = "PUBLIC" | "CONNECTIONS";

type Option = {
  value: PostVisibilityChoice;
  title: string;
  subtitle: string;
  emoji: string;
};

const OPTIONS: Option[] = [
  {
    value: "PUBLIC",
    title: "Community",
    subtitle: "Visible to all community members",
    emoji: "🌍"
  },
  {
    value: "CONNECTIONS",
    title: "Connections Only",
    subtitle: "Only your accepted connections",
    emoji: "🤝"
  }
];

type Props = {
  value: PostVisibilityChoice;
  onChange: (value: PostVisibilityChoice) => void;
  disabled?: boolean;
};

/**
 * Minimal segmented visibility picker for Create Post.
 * Default: Community (PUBLIC).
 */
function PostVisibilitySelectorInner({ value, onChange, disabled }: Props) {
  const { colors, mode } = useTheme();

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.text }]}>Who can see this post?</Text>
      <View style={styles.row}>
        {OPTIONS.map((opt) => {
          const selected = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              disabled={disabled}
              onPress={() => onChange(opt.value)}
              style={({ pressed }) => [
                styles.option,
                {
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected
                    ? mode === "dark"
                      ? "rgba(59,130,246,0.16)"
                      : "rgba(37,99,235,0.06)"
                    : colors.surface,
                  opacity: disabled ? 0.5 : pressed ? 0.85 : 1
                }
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${opt.title}. ${opt.subtitle}`}
            >
              <Text style={styles.emoji}>{opt.emoji}</Text>
              <Text
                style={[
                  styles.title,
                  { color: selected ? colors.primary : colors.text }
                ]}
                numberOfLines={1}
              >
                {opt.title}
              </Text>
              <Text style={[styles.sub, { color: colors.textSecondary }]} numberOfLines={2}>
                {opt.subtitle}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: spacing.sm
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm
  },
  option: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    gap: 4
  },
  emoji: { fontSize: 22, marginBottom: 2 },
  title: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  sub: { fontSize: 11, textAlign: "center", lineHeight: 15 }
});

export const PostVisibilitySelector = memo(PostVisibilitySelectorInner);
