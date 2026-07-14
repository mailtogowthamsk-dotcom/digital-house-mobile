import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { typography } from "../../theme/typography";
import { spacing, radius } from "../../theme/spacing";

type ActionButtonsProps = {
  onEditPress: () => void;
  onLogoutPress: () => void;
};

export function ActionButtons({ onEditPress, onLogoutPress }: ActionButtonsProps) {
  const { colors } = useTheme();
  const s = useMemo(
    () =>
      StyleSheet.create({
        section: { marginBottom: spacing.xxl },
        btnWrap: { marginBottom: spacing.sm },
        btn: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: spacing.sm,
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.lg,
          marginBottom: spacing.sm
        },
        btnPrimary: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: spacing.sm,
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.lg
        },
        pressed: { opacity: 0.92 },
        btnTextPrimary: { ...typography.button, color: colors.white },
        logoutBtn: {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.error + "40"
        },
        logoutText: { ...typography.body, color: colors.error, fontWeight: "600" }
      }),
    [colors]
  );

  return (
    <View style={s.section}>
      <Pressable
        style={({ pressed }) => [s.btnWrap, pressed && s.pressed]}
        onPress={onEditPress}
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={s.btnPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Ionicons name="create-outline" size={22} color={colors.white} />
          <Text style={s.btnTextPrimary}>Edit Profile</Text>
        </LinearGradient>
      </Pressable>
      <Pressable
        style={({ pressed }) => [s.btn, s.logoutBtn, pressed && s.pressed]}
        onPress={onLogoutPress}
      >
        <Ionicons name="log-out-outline" size={22} color={colors.error} />
        <Text style={s.logoutText}>Log out</Text>
      </Pressable>
    </View>
  );
}
