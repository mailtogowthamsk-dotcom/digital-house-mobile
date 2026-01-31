import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Platform
} from "react-native";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing, radius } from "../../theme/spacing";

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

/**
 * Reusable confirmation dialog for critical actions.
 * Clear, minimal, trust-oriented. Use for logout, delete, etc.
 */
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
  const isDestructive = variant === "destructive";

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

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Platform.OS === "ios" ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.5)"
  },
  centered: { width: "100%", alignItems: "center", paddingHorizontal: spacing.xl },
  card: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12
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
  actions: {
    flexDirection: "row",
    gap: spacing.md
  },
  btn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  btnCancel: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border
  },
  btnConfirm: {
    backgroundColor: colors.primary
  },
  btnDestructive: {
    backgroundColor: colors.error
  },
  btnCancelText: { ...typography.buttonSmall, color: colors.textSecondary },
  btnConfirmText: { ...typography.buttonSmall, color: colors.white },
  pressed: { opacity: 0.9 }
});
