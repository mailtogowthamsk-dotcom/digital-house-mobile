import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Dimensions,
  ActivityIndicator,
  TextInput,
  ScrollView
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../theme/ThemeContext";
import { spacing } from "../../theme/spacing";
import { useAuth } from "../../context/AuthContext";
import { appAlert } from "../../utils/appAlert";
import { getOwnReferralStatus, submitReferralCode } from "../../api/auth.api";
import { getAuthErrorMessage } from "../../api/client";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const LOGO = require("../../../assets/logo_digital_house.png");

export function PendingApprovalScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { refreshSession, signOut, user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [referralStatus, setReferralStatus] = useState<string>("NOT_PROVIDED");
  const [canSubmitReferral, setCanSubmitReferral] = useState(false);
  const [adminNote, setAdminNote] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

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
          paddingHorizontal: spacing.xl,
          paddingTop: 60,
          paddingBottom: 40,
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
          marginBottom: spacing.md,
          textAlign: "center"
        },
        subtitle: {
          fontSize: 15,
          color: colors.textSecondary,
          lineHeight: 22,
          textAlign: "center",
          marginBottom: spacing.lg
        },
        email: {
          fontSize: 13,
          color: colors.textSecondary,
          textAlign: "center",
          marginBottom: spacing.lg
        },
        referralBox: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          padding: spacing.md,
          marginBottom: spacing.lg
        },
        referralTitle: {
          fontSize: 15,
          fontWeight: "700",
          color: colors.text,
          marginBottom: spacing.sm,
          textAlign: "center"
        },
        input: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 12,
          fontSize: 16,
          color: colors.text,
          marginTop: spacing.sm
        },
        success: { fontSize: 13, color: colors.primary, textAlign: "center", marginTop: spacing.sm },
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

  const loadReferral = useCallback(async () => {
    if (!user) return;
    try {
      const info = await getOwnReferralStatus();
      setReferralStatus(info.status);
      setCanSubmitReferral(info.canSubmit);
      setAdminNote(info.adminNote);
    } catch {
      /* pending users still see the review copy */
    }
  }, [user]);

  useEffect(() => {
    void loadReferral();
  }, [loadReferral]);

  const onRefresh = useCallback(async () => {
    if (!user) {
      navigation.navigate("Login");
      return;
    }
    setRefreshing(true);
    try {
      await refreshSession();
      await loadReferral();
    } catch {
      appAlert("Could not refresh status", "Please try again in a moment.");
    } finally {
      setRefreshing(false);
    }
  }, [refreshSession, user, navigation, loadReferral]);

  const onSubmitReferral = useCallback(async () => {
    const code = referralCode.trim();
    if (!code) {
      appAlert("Referral code", "Enter a referral code from an existing Digital House member.");
      return;
    }
    setSubmitting(true);
    setSubmitMessage(null);
    try {
      const result = await submitReferralCode(code);
      setSubmitMessage(result.message);
      setReferralCode("");
      await loadReferral();
    } catch (e) {
      appAlert("Referral code", getAuthErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }, [referralCode, loadReferral]);

  const showReferralForm = canSubmitReferral || referralStatus === "REQUESTED";

  return (
    <View style={s.background}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
      <View style={s.overlay} />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Image source={LOGO} style={s.logo} resizeMode="contain" />
        <View style={s.card}>
          <Text style={s.title}>Registration Submitted</Text>
          <Text style={s.subtitle}>
            Your registration is currently under admin review. Please wait until verification is
            completed. We'll notify you once your account is approved. After approval, sign in
            again with OTP or Google to open the app.
            {!user
              ? " Sign in with OTP or Google anytime to refresh your status."
              : ""}
          </Text>
          {user?.email ? <Text style={s.email}>{user.email}</Text> : null}

          {showReferralForm ? (
            <View style={s.referralBox}>
              <Text style={s.referralTitle}>Additional Verification Required</Text>
              <Text style={s.subtitle}>
                {adminNote ||
                  "Admin has requested a referral code from an existing Digital House member."}
              </Text>
              <TextInput
                style={s.input}
                placeholder="Referral Code"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                value={referralCode}
                onChangeText={setReferralCode}
              />
              <Pressable
                style={({ pressed }) => [s.btnWrap, { marginTop: spacing.md }, pressed && { opacity: 0.9 }]}
                onPress={() => void onSubmitReferral()}
                disabled={submitting}
              >
                <LinearGradient
                  colors={[colors.primary, colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.btn}
                >
                  {submitting ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={s.btnText}>Submit Referral Code</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          ) : null}
          {submitMessage ? <Text style={s.success}>{submitMessage}</Text> : null}
          {referralStatus === "PENDING_ADMIN_VERIFICATION" ? (
            <Text style={s.success}>
              Referral submitted successfully. Your registration is pending admin verification.
            </Text>
          ) : null}

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
      </ScrollView>
    </View>
  );
}
