import React, { useState, useMemo } from "react";
import { View, Text, TextInput, StyleSheet, TextInputProps, ViewStyle } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { typography } from "../../theme/typography";
import { spacing, radius } from "../../theme/spacing";
import { fonts } from "../../theme/fonts";
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
  editable = true,
  ...props
}: InputProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const isLight = variant === "light";
  const onWhite = variant === "onWhite";
  const isDisabled = editable === false;

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
          borderRadius: radius.input,
          minHeight: TEXT_FIELD_MIN_HEIGHT,
          overflow: "visible"
        },
        inputRowLight: {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.border
        },
        inputRowOnWhite: {
          backgroundColor: "#F9FAFB",
          borderColor: "#E5E7EB"
        },
        inputRowFocused: {
          borderColor: colors.primary,
          backgroundColor: colors.surface
        },
        inputRowLightFocused: {
          borderColor: colors.primary,
          backgroundColor: colors.surface
        },
        inputRowOnWhiteFocused: {
          borderColor: "#16803C",
          backgroundColor: "#FFFFFF"
        },
        inputRowDisabled: {
          opacity: 0.65,
          backgroundColor: onWhite ? "#F3F4F6" : colors.surfaceElevated
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
          fontFamily: fonts.regular,
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
          focused && !error && s.inputRowFocused,
          isLight && focused && !error && s.inputRowLightFocused,
          onWhite && focused && !error && s.inputRowOnWhiteFocused,
          isDisabled && s.inputRowDisabled
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
          editable={editable}
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
