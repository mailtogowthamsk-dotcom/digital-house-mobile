import React from "react";
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing, radius } from "../../theme/spacing";

type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "outline";
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
  variant = "primary",
  style,
  textStyle
}: PrimaryButtonProps) {
  const isOutline = variant === "outline";
  const isSecondary = variant === "secondary";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.btn,
        isOutline && s.btnOutline,
        isSecondary && s.btnSecondary,
        (pressed || loading) && s.btnPressed,
        style
      ]}
    >
      <Text style={[s.btnText, isOutline && s.btnTextOutline, isSecondary && s.btnTextSecondary, textStyle]}>
        {loading ? "Please wait..." : title}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52
  },
  btnOutline: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: colors.primary
  },
  btnSecondary: {
    backgroundColor: colors.surfaceElevated
  },
  btnPressed: { opacity: 0.85 },
  btnText: {
    ...typography.button,
    color: colors.white
  },
  btnTextOutline: { color: colors.primary },
  btnTextSecondary: { color: colors.text }
});
