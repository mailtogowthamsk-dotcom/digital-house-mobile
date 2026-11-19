import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  StatusBar,
  useWindowDimensions,
  ActivityIndicator,
  TextInput,
  ScrollView
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image as ExpoImage } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppKeyboardAvoidingView } from "../../components/ui/AppKeyboardAvoidingView";
import { fonts } from "../../theme/fonts";
import { spacing } from "../../theme/spacing";
import { useAuth } from "../../context/AuthContext";
import { appAlert } from "../../utils/appAlert";
import { getOwnReferralStatus, submitReferralCode } from "../../api/auth.api";
import { getAuthErrorMessage } from "../../api/client";

const LOGO = require("../../../assets/logo_digital_house.png");

const SCENERY = require("../../../assets/landing_scenery.jpg");
const BRAND_DEEP = "#163E31";
const BRAND_PRIMARY = "#14563F";
const BORDER = "#DCE7DF";
const MUTED = "#52645B";
const GRADIENT = [
  "rgba(255,248,233,0.48)",
  "rgba(252,248,239,0.84)",
  "rgba(228,240,229,0.62)"
] as const;

export function PendingApprovalScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const logoSize = Math.min(width * 0.24, height * 0.12, 88);
  const { refreshSession, signOut, user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [referralStatus, setReferralStatus] = useState<string>("NOT_PROVIDED");
  const [canSubmitReferral, setCanSubmitReferral] = useState(false);
  const [adminNote, setAdminNote] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

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
      <ExpoImage
        source={SCENERY}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="top center"
        accessible={false}
        pointerEvents="none"
      />
      <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <AppKeyboardAvoidingView style={s.keyboard}>
        <ScrollView
          contentContainerStyle={[
            s.content,
            { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl }
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Image source={LOGO} style={{ width: logoSize, height: logoSize }} resizeMode="contain" />
          <Text style={s.brandTitle}>Digital House</Text>
          <View style={s.card}>
            <View style={s.statusIcon} accessible={false}>
              <Ionicons name="time-outline" size={26} color={BRAND_PRIMARY} />
            </View>
            <Text style={s.title} accessibilityRole="header">Registration under review</Text>
            <Text style={s.subtitle}>
              An admin is reviewing your registration. This usually takes 1–2 days.
              We’ll notify you when your account is approved. You can then sign in with OTP or Google.
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
                  placeholderTextColor={MUTED}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  value={referralCode}
                  onChangeText={setReferralCode}
                />
                <Pressable
                  style={({ pressed }) => [s.btnWrap, pressed && { opacity: 0.9 }]}
                  onPress={() => void onSubmitReferral()}
                  accessibilityRole="button"
                  disabled={submitting}
                >
                  <LinearGradient
                    colors={["#1C6C50", BRAND_PRIMARY]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.btn}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#FFFFFF" />
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
              accessibilityRole="button"
              disabled={refreshing}
            >
              <LinearGradient
                colors={["#1C6C50", BRAND_PRIMARY]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.btn}
              >
                {refreshing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={s.btnText}>{user ? "Refresh Status" : "Sign In to Check Status"}</Text>
                )}
              </LinearGradient>
            </Pressable>
            <Pressable
              style={({ pressed }) => [s.btnSecondary, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
              onPress={() => {
                if (user) void signOut();
                else navigation.navigate("Landing");
              }}
            >
              <Text style={s.btnTextSecondary}>{user ? "Logout" : "Back"}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </AppKeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  background: { flex: 1, backgroundColor: "#FCF8EF" },
  keyboard: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, alignItems: "center" },
  brandTitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    color: BRAND_DEEP,
    fontFamily: fonts.bold,
    fontSize: 24
  },
  card: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#FFFFFF",
    borderColor: BORDER,
    borderWidth: 1,
    borderRadius: 20,
    padding: spacing.lg,
    shadowColor: BRAND_DEEP,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4
  },
  statusIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#EDF6EF",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: spacing.md
  },
  title: {
    color: BRAND_DEEP,
    fontFamily: fonts.bold,
    fontSize: 22,
    textAlign: "center",
    marginBottom: spacing.sm
  },
  subtitle: { color: MUTED, fontSize: 14, lineHeight: 21 },
  email: { color: BRAND_DEEP, fontSize: 13, textAlign: "center", marginTop: spacing.sm },
  referralBox: {
    backgroundColor: "#F6FAF7",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: spacing.md,
    marginTop: spacing.md
  },
  referralTitle: { color: BRAND_DEEP, fontFamily: fonts.bold, fontSize: 15, marginBottom: spacing.xs },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 46,
    fontSize: 16,
    color: BRAND_DEEP,
    marginTop: spacing.sm
  },
  success: { color: BRAND_PRIMARY, fontSize: 13, textAlign: "center", marginTop: spacing.sm },
  btnWrap: { width: "100%", marginTop: spacing.md },
  btn: { minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  btnSecondary: {
    minHeight: 44,
    marginTop: spacing.sm,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER
  },
  btnText: { fontSize: 15, fontFamily: fonts.semiBold, color: "#FFFFFF" },
  btnTextSecondary: { fontSize: 15, fontFamily: fonts.semiBold, color: BRAND_DEEP }
});
