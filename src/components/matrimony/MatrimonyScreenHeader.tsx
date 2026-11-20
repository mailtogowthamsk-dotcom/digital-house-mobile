import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { HeaderBackButton } from "../ui/HeaderBackButton";

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
      <HeaderBackButton onPress={onBack} />

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
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  pressed: { opacity: 0.7 },
  titleWrap: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, fontWeight: "700" },
  subtitle: { fontSize: 12, marginTop: 1 },
  labelBtn: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    maxWidth: 140
  },
  rightLabel: { fontSize: 12, fontWeight: "700" }
});
