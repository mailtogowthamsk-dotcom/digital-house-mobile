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
          marginTop: spacing.sm,
          marginBottom: spacing.xxl
        },
        logoutBtn: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: spacing.sm,
          paddingVertical: 14,
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
