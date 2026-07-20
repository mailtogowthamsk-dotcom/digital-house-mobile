import React from "react";
import { View, TextInput, Pressable, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
};

export function ExploreSearchBar({
  value,
  onChangeText,
  placeholder = "Search posts, people, #hashtags",
  autoFocus
}: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border
        }
      ]}
    >
      <Ionicons name="search" size={18} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text }]}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        returnKeyType="search"
        clearButtonMode="never"
      />
      {value.length > 0 ? (
        <Pressable onPress={() => onChangeText("")} hitSlop={8} accessibilityLabel="Clear search">
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48
  },
  input: {
    flex: 1,
    fontSize: 15,
    minHeight: 36,
    paddingVertical: 0
  }
});
