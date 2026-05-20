import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing } from "../../theme/spacing";

type Props = {
  title: string;
  onBack: () => void;
  rightLabel?: string;
  onRightPress?: () => void;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
};

export function MatrimonyScreenHeader({
  title,
  onBack,
  rightLabel,
  onRightPress,
  rightIcon,
  onRightIconPress
}: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.row, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
      <Pressable onPress={onBack} hitSlop={10} style={styles.back}>
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </Pressable>
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
        {title}
      </Text>
      {rightLabel && onRightPress ? (
        <Pressable onPress={onRightPress} hitSlop={8}>
          <Text style={[styles.right, { color: colors.primary }]}>{rightLabel}</Text>
        </Pressable>
      ) : rightIcon && onRightIconPress ? (
        <Pressable onPress={onRightIconPress} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name={rightIcon} size={22} color={colors.text} />
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
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8
  },
  back: { paddingRight: 4 },
  title: { flex: 1, fontSize: 17, fontWeight: "800", minWidth: 0 },
  right: { fontSize: 13, fontWeight: "700" },
  iconBtn: { width: 36, alignItems: "center" },
  placeholder: { width: 36 }
});
