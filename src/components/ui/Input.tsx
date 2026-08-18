import React, { useState, useMemo } from "react";
import { View, Text, TextInput, StyleSheet, TextInputProps, ViewStyle } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { typography } from "../../theme/typography";
import { spacing, radius } from "../../theme/spacing";
import { TEXT_FIELD_MIN_HEIGHT, textFieldPad } from "../../theme/textField";

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
  /** `onWhite` = light field on hardcoded white auth cards (theme-independent). */
  variant?: "default" | "light" | "onWhite";
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
  multiline,
  ...props
}: InputProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const isLight = variant === "light";
  const onWhite = variant === "onWhite";

  const s = useMemo(
    () =>
      StyleSheet.create({
        wrap: { marginBottom: spacing.lg },
        label: {
          ...typography.label,
          color: onWhite ? "#6B7280" : colors.textSecondary,
          marginBottom: spacing.sm
        },
        inputRow: {
          flexDirection: "row",
          alignItems: multiline ? "flex-start" : "center",
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.lg,
          minHeight: TEXT_FIELD_MIN_HEIGHT,
          overflow: "visible"
        },
        inputRowLight: {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.border
        },
        inputRowOnWhite: {
          backgroundColor: "#F3F4F6",
          borderColor: "#E5E7EB"
        },
        inputRowLightFocused: {
          borderColor: colors.primary,
          backgroundColor: colors.surface
        },
        inputRowOnWhiteFocused: {
          borderColor: "#2563EB",
          backgroundColor: "#FFFFFF"
        },
        iconWrap: {
          paddingLeft: spacing.lg,
          paddingRight: spacing.sm,
          paddingTop: multiline ? 16 : 0,
          justifyContent: "center",
          alignSelf: multiline ? "flex-start" : "center"
        },
        input: {
          flex: 1,
          minHeight: TEXT_FIELD_MIN_HEIGHT,
          paddingHorizontal: spacing.lg,
          ...textFieldPad,
          fontSize: 16,
          fontWeight: "400",
          color: colors.text
        },
        inputWithIcon: { paddingLeft: 0 },
        inputOnWhite: { color: "#111827" },
        inputError: { borderColor: colors.error },
        error: {
          ...typography.caption,
          color: colors.error,
          marginTop: spacing.xs
        }
      }),
    [colors, onWhite, multiline]
  );

  return (
    <View style={[s.wrap, containerStyle]}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <View
        style={[
          s.inputRow,
          isLight && s.inputRowLight,
          onWhite && s.inputRowOnWhite,
          error && s.inputError,
          isLight && focused && s.inputRowLightFocused,
          onWhite && focused && s.inputRowOnWhiteFocused
        ]}
      >
        {leftIcon ? <View style={s.iconWrap}>{leftIcon}</View> : null}
        <TextInput
          placeholderTextColor={
            placeholderTextColor ?? (onWhite ? "#9CA3AF" : colors.textMuted)
          }
          style={[
            s.input,
            leftIcon ? s.inputWithIcon : undefined,
            onWhite && s.inputOnWhite,
            multiline ? { textAlignVertical: "top" as const } : undefined,
            style
          ]}
          underlineColorAndroid="transparent"
          multiline={multiline}
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
