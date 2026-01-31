import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, TextInputProps, ViewStyle } from "react-native";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing, radius } from "../../theme/spacing";

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
  /** Light style for use on white/light cards (e.g. auth screens) */
  variant?: "default" | "light";
};

export function Input({
  label,
  error,
  containerStyle,
  style,
  placeholderTextColor,
  leftIcon,
  variant = "default",
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const isLight = variant === "light";
  return (
    <View style={[s.wrap, containerStyle]}>
      {label ? <Text style={[s.label, isLight && s.labelLight]}>{label}</Text> : null}
      <View
        style={[
          s.inputRow,
          isLight && s.inputRowLight,
          error && s.inputError,
          isLight && focused && s.inputRowLightFocused
        ]}
      >
        {leftIcon ? <View style={s.iconWrap}>{leftIcon}</View> : null}
        <TextInput
          placeholderTextColor={placeholderTextColor ?? (isLight ? "#9CA3AF" : colors.textMuted)}
          style={[s.input, leftIcon && s.inputWithIcon, isLight && s.inputLight, style]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
      </View>
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm
  },
  labelLight: {
    color: "#6B7280"
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    minHeight: 52
  },
  inputRowLight: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB"
  },
  inputRowLightFocused: {
    borderColor: "#2563EB",
    backgroundColor: "#FFFFFF"
  },
  iconWrap: {
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    ...typography.body,
    color: colors.text
  },
  inputWithIcon: {
    paddingLeft: 0
  },
  inputLight: {
    color: "#111827"
  },
  inputError: { borderColor: colors.error },
  error: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs
  }
});
