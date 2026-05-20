import React, { useState, useMemo } from "react";
import { View, Text, TextInput, StyleSheet, TextInputProps, ViewStyle } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { typography } from "../../theme/typography";
import { spacing, radius } from "../../theme/spacing";

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
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
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const isLight = variant === "light";

  const s = useMemo(
    () =>
      StyleSheet.create({
        wrap: { marginBottom: spacing.lg },
        label: {
          ...typography.label,
          color: colors.textSecondary,
          marginBottom: spacing.sm
        },
        labelLight: { color: colors.textSecondary },
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
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.border
        },
        inputRowLightFocused: {
          borderColor: colors.primary,
          backgroundColor: colors.surface
        },
        iconWrap: { paddingLeft: spacing.lg, paddingRight: spacing.sm },
        input: {
          flex: 1,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.lg,
          ...typography.body,
          color: colors.text
        },
        inputWithIcon: { paddingLeft: 0 },
        inputLight: { color: colors.text },
        inputError: { borderColor: colors.error },
        error: {
          ...typography.caption,
          color: colors.error,
          marginTop: spacing.xs
        }
      }),
    [colors]
  );

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
          placeholderTextColor={placeholderTextColor ?? colors.textMuted}
          style={[s.input, leftIcon ? s.inputWithIcon : undefined, isLight && s.inputLight, style]}
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
