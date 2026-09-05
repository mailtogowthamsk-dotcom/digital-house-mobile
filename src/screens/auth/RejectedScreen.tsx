import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Image, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../theme/ThemeContext";
import { spacing } from "../../theme/spacing";
import { useAuth } from "../../context/AuthContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const LOGO = require("../../../assets/logo_digital_house.png");

type RejectedScreenProps = { route?: { params?: { message?: string } } };

export function RejectedScreen({ route }: RejectedScreenProps) {
  const { colors } = useTheme();
  const { user, signOut } = useAuth();
  const message =
    route?.params?.message ||
    user?.registrationAdminRemarks?.trim() ||
    "Your account was not approved. Please contact support if you believe this is an error.";

  const gradientColors = useMemo(
    () => [colors.background, colors.surfaceElevated, colors.background] as const,
    [colors]
  );
  const s = useMemo(
    () =>
      StyleSheet.create({
        background: { flex: 1 },
        overlay: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.2)" },
        content: {
          flex: 1,
          paddingHorizontal: spacing.xl,
          paddingTop: 60,
          alignItems: "center"
        },
        logo: {
          width: Math.min(SCREEN_WIDTH * 0.36, 148),
          height: Math.min(SCREEN_WIDTH * 0.36, 148),
          marginBottom: spacing.xl
        },
        card: {
          backgroundColor: colors.surface,
          borderRadius: 18,
          padding: spacing.xxl,
          width: "100%",
          maxWidth: 360,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 6
        },
        title: {
          fontSize: 22,
          fontWeight: "700",
          color: colors.text,
          marginBottom: spacing.lg,
          textAlign: "center"
        },
        subtitle: {
          fontSize: 15,
          color: colors.textSecondary,
          lineHeight: 22,
          textAlign: "center",
          marginBottom: spacing.xxl
        },
        btnWrap: { width: "100%", marginBottom: spacing.md },
        btn: {
          paddingVertical: 16,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center"
        },
        btnSecondary: {
          paddingVertical: 14,
          borderRadius: 14,
          alignItems: "center",
          borderWidth: 1,
          borderColor: colors.border
        },
        btnText: { fontSize: 17, fontWeight: "600", color: colors.white },
        btnTextSecondary: { fontSize: 15, fontWeight: "600", color: colors.textSecondary }
      }),
    [colors]
  );

  return (
    <View style={s.background}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
      <View style={s.overlay} />
      <View style={s.content}>
        <Image source={LOGO} style={s.logo} resizeMode="contain" />
        <View style={s.card}>
          <Text style={s.title}>Registration Rejected</Text>
          <Text style={s.subtitle}>{message}</Text>
          <Pressable
            style={({ pressed }) => [s.btnWrap, pressed && { opacity: 0.9 }]}
            onPress={() => void signOut()}
          >
            <LinearGradient
              colors={[colors.primary, colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.btn}
            >
              <Text style={s.btnText}>Logout</Text>
            </LinearGradient>
          </Pressable>
          <Pressable style={s.btnSecondary} disabled>
            <Text style={s.btnTextSecondary}>Contact Support (coming soon)</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
