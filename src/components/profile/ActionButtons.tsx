import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { typography } from "../../theme/typography";
import { spacing, radius } from "../../theme/spacing";

type ActionButtonsProps = {
  onLogoutPress: () => void;
};

export function ActionButtons({ onLogoutPress }: ActionButtonsProps) {
  const { colors } = useTheme();
  const s = useMemo(
    () =>
      StyleSheet.create({
        section: {
          marginTop: spacing.md,
          marginBottom: spacing.xxl
        },
        label: {
          ...typography.caption,
          color: colors.textMuted,
          fontWeight: "700",
          letterSpacing: 0.5,
          textTransform: "uppercase",
          marginBottom: spacing.sm,
          marginLeft: 2
        },
        logoutBtn: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: spacing.sm,
          paddingVertical: 13,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.lg,
          backgroundColor: colors.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border
        },
        pressed: { backgroundColor: colors.error + "0D" },
        logoutText: {
          ...typography.bodySmall,
          color: colors.error,
          fontWeight: "600"
        }
      }),
    [colors]
  );

  return (
    <View style={s.section}>
      <Text style={s.label}>Account</Text>
      <Pressable
        style={({ pressed }) => [s.logoutBtn, pressed && s.pressed]}
        onPress={onLogoutPress}
        accessibilityRole="button"
        accessibilityLabel="Log out"
      >
        <Ionicons name="log-out-outline" size={18} color={colors.error} />
        <Text style={s.logoutText}>Log out</Text>
      </Pressable>
    </View>
  );
}
