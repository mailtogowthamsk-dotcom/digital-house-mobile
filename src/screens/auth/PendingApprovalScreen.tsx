import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, Image, Dimensions, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../theme/ThemeContext";
import { spacing } from "../../theme/spacing";
import { useAuth } from "../../context/AuthContext";
import { appAlert } from "../../utils/appAlert";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const LOGO = require("../../../assets/logo_digital_house.png");

export function PendingApprovalScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { refreshSession, signOut, user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const gradientColors = useMemo(
    () => [colors.background, colors.surfaceElevated, colors.background] as const,
    [colors]
  );
  const s = useMemo(
    () =>
      StyleSheet.create({
        background: { flex: 1 },
        overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.2)" },
        content: {
          flex: 1,
          paddingHorizontal: spacing.xl,
          paddingTop: 60,
          alignItems: "center"
        },
        logo: {
          width: Math.min(SCREEN_WIDTH * 0.4, 160),
          height: 80,
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
          marginBottom: spacing.md,
          textAlign: "center"
        },
        subtitle: {
          fontSize: 15,
          color: colors.textSecondary,
          lineHeight: 22,
          textAlign: "center",
          marginBottom: spacing.xxl
        },
        email: {
          fontSize: 13,
          color: colors.textSecondary,
          textAlign: "center",
          marginBottom: spacing.lg
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
          justifyContent: "center",
          borderWidth: 1,
          borderColor: colors.border
        },
        btnText: { fontSize: 17, fontWeight: "600", color: colors.white },
        btnTextSecondary: { fontSize: 16, fontWeight: "600", color: colors.text }
      }),
    [colors]
  );

  const onRefresh = useCallback(async () => {
    if (!user) {
      navigation.navigate("Login");
      return;
    }
    setRefreshing(true);
    try {
      await refreshSession();
    } catch {
      appAlert("Could not refresh status", "Please try again in a moment.");
    } finally {
      setRefreshing(false);
    }
  }, [refreshSession, user, navigation]);

  return (
    <View style={s.background}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
      <View style={s.overlay} />
      <View style={s.content}>
        <Image source={LOGO} style={s.logo} resizeMode="contain" />
        <View style={s.card}>
          <Text style={s.title}>Registration Submitted</Text>
          <Text style={s.subtitle}>
            Your registration is currently under admin review. Please wait until verification is
            completed. We'll notify you once your account is approved.
            {!user
              ? " Sign in with OTP or Google anytime to refresh your status."
              : ""}
          </Text>
          {user?.email ? <Text style={s.email}>{user.email}</Text> : null}
          <Pressable
            style={({ pressed }) => [s.btnWrap, pressed && { opacity: 0.9 }]}
            onPress={onRefresh}
            disabled={refreshing}
          >
            <LinearGradient
              colors={[colors.primary, colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.btn}
            >
              {refreshing ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={s.btnText}>{user ? "Refresh Status" : "Sign In to Check Status"}</Text>
              )}
            </LinearGradient>
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.btnSecondary, pressed && { opacity: 0.85 }]}
            onPress={() => {
              if (user) void signOut();
              else navigation.navigate("Landing");
            }}
          >
            <Text style={s.btnTextSecondary}>{user ? "Logout" : "Back"}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
