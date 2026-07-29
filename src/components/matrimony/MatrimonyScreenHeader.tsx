import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";

type Props = {
  title: string;
  subtitle?: string;
  onBack: () => void;
  rightLabel?: string;
  onRightPress?: () => void;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  rightIconLabel?: string;
  onRightIconPress?: () => void;
};

export function MatrimonyScreenHeader({
  title,
  subtitle,
  onBack,
  rightLabel,
  onRightPress,
  rightIcon,
  rightIconLabel,
  onRightIconPress
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.row,
        {
          borderBottomColor: colors.border,
          backgroundColor: colors.surface,
          paddingTop: insets.top + spacing.xs
        }
      ]}
    >
      <Pressable
        onPress={onBack}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={({ pressed }) => [
          styles.iconBtn,
          { backgroundColor: colors.surfaceElevated },
          pressed && styles.pressed
        ]}
      >
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>

      <View style={styles.titleWrap}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {rightLabel && onRightPress ? (
        <Pressable
          onPress={onRightPress}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={rightLabel}
          style={({ pressed }) => [
            styles.labelBtn,
            { backgroundColor: colors.surfaceElevated },
            pressed && styles.pressed
          ]}
        >
          <Text style={[styles.rightLabel, { color: colors.primary }]} numberOfLines={1}>
            {rightLabel}
          </Text>
        </Pressable>
      ) : rightIcon && onRightIconPress ? (
        <Pressable
          onPress={onRightIconPress}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={rightIconLabel ?? "More options"}
          style={({ pressed }) => [
            styles.iconBtn,
            { backgroundColor: colors.surfaceElevated },
            pressed && styles.pressed
          ]}
        >
          <Ionicons name={rightIcon} size={20} color={colors.text} />
        </Pressable>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center"
  },
  pressed: { opacity: 0.7 },
  titleWrap: { flex: 1, minWidth: 0 },
  title: { fontSize: 18, fontWeight: "800" },
  subtitle: { fontSize: 12, marginTop: 1 },
  labelBtn: {
    height: 34,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    maxWidth: 140
  },
  rightLabel: { fontSize: 13, fontWeight: "700" },
  placeholder: { width: 40 }
});
