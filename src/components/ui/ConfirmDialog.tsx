import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable
} from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { typography } from "../../theme/typography";
import { spacing, radius } from "../../theme/spacing";
import { elevatedShadow } from "../../theme/shadows";

export type ConfirmDialogVariant = "default" | "destructive";

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: ConfirmDialogVariant;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  variant = "default"
}: ConfirmDialogProps) {
  const { colors, mode } = useTheme();
  const isDestructive = variant === "destructive";

  const s = useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.overlay
        },
        centered: { width: "100%", alignItems: "center", paddingHorizontal: spacing.xl },
        card: {
          width: "100%",
          maxWidth: 340,
          backgroundColor: colors.surface,
          borderRadius: radius.xl,
          padding: spacing.xxl,
          ...elevatedShadow(mode)
        },
        title: {
          ...typography.h3,
          color: colors.text,
          textAlign: "center",
          marginBottom: spacing.sm
        },
        message: {
          ...typography.bodySmall,
          color: colors.textSecondary,
          textAlign: "center",
          lineHeight: 22,
          marginBottom: spacing.xl
        },
        actions: { flexDirection: "row", gap: spacing.md },
        btn: {
          flex: 1,
          minHeight: 48,
          paddingVertical: spacing.md,
          borderRadius: radius.button,
          alignItems: "center",
          justifyContent: "center"
        },
        btnCancel: {
          backgroundColor: colors.surfaceElevated,
          borderWidth: 1,
          borderColor: colors.border
        },
        btnConfirm: { backgroundColor: colors.primary },
        btnDestructive: { backgroundColor: colors.error },
        btnCancelText: { ...typography.buttonSmall, color: colors.text },
        btnConfirmText: { ...typography.buttonSmall, color: colors.white },
        pressed: { opacity: 0.9 }
      }),
    [colors, mode]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Pressable style={s.backdrop} onPress={onCancel}>
        <Pressable style={s.centered} onPress={(e) => e.stopPropagation()}>
          <View style={s.card}>
            <Text style={s.title}>{title}</Text>
            <Text style={s.message}>{message}</Text>
            <View style={s.actions}>
              <Pressable
                style={({ pressed }) => [s.btn, s.btnCancel, pressed && s.pressed]}
                onPress={onCancel}
                accessibilityRole="button"
              >
                <Text style={s.btnCancelText}>{cancelLabel}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  s.btn,
                  isDestructive ? s.btnDestructive : s.btnConfirm,
                  pressed && s.pressed
                ]}
                onPress={onConfirm}
                accessibilityRole="button"
              >
                <Text style={s.btnConfirmText}>{confirmLabel}</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
