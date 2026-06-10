import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  Keyboard,
  StatusBar
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { googleAuth, loginRequest } from "../../api/auth.api";
import { getApiBaseUrl, getAuthErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { EXPO_GO_GOOGLE_MESSAGE, useGoogleSignIn } from "../../hooks/useGoogleSignIn";
import { Input } from "../../components/ui/Input";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { spacing } from "../../theme/spacing";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const LOGO = require("../../../assets/logo_digital_house.png");
const LANDING_GRADIENT = ["#0B1220", "#1a2744", "#0d1829"] as const;

const ICON_COLOR = "#6B7280";
const ICON_SIZE = 20;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const {
    signIn: getGoogleToken,
    configured: googleConfigured,
    available: googleAvailable,
    isExpoGo,
    ready: googleReady
  } = useGoogleSignIn();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onGoogleSignIn = async () => {
    Keyboard.dismiss();
    setMsg(null);
    setGoogleLoading(true);
    try {
      const idToken = await getGoogleToken();
      if (!idToken) return;
      const result = await googleAuth(idToken);
      await signIn(result.accessToken, result.user);
      if (result.needsProfileCompletion) {
        navigation.reset({ index: 0, routes: [{ name: "GoogleCompleteProfile" }] });
        return;
      }
      if (result.user.status === "APPROVED") {
        navigation.reset({ index: 0, routes: [{ name: "Home" }] });
      } else if (result.user.status === "PENDING") {
        navigation.replace("PendingApproval");
      } else if (result.user.status === "REJECTED") {
        navigation.replace("Rejected", { message: "Your account was not approved." });
      }
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { message?: string } } };
      const status = err.response?.status;
      if (status === 403) {
        const backendMsg = err.response?.data?.message ?? "";
        if (backendMsg.includes("not approved") || backendMsg.includes("rejected")) {
          navigation.replace("Rejected", { message: backendMsg });
          return;
        }
      }
      setMsg(getAuthErrorMessage(e));
    } finally {
      setGoogleLoading(false);
    }
  };

  const onSend = async () => {
    Keyboard.dismiss();
    setMsg(null);
    if (!email.trim()) {
      setMsg("Please enter your email.");
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setMsg("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      await loginRequest(email.trim());
      navigation.navigate("OtpVerify", { email: email.trim().toLowerCase() });
    } catch (e: any) {
      const status = e?.response?.status;
      const backendMsg = e?.response?.data?.message ?? "";
      if (status === 403) {
        if (backendMsg.includes("under verification") || backendMsg.includes("verification")) {
          navigation.replace("PendingApproval");
          return;
        }
        if (backendMsg.includes("not approved") || backendMsg.includes("rejected")) {
          navigation.replace("Rejected", { message: backendMsg });
          return;
        }
      }
      if (status === 404) {
        setMsg(backendMsg || "No account found. Please register first.");
        return;
      }
      if (status === 503) {
        setMsg(backendMsg || "Server is starting up. Please try again in a few seconds.");
        return;
      }
      if (status === 500 && backendMsg) {
        setMsg(backendMsg);
        return;
      }
      const isNetwork =
        !e?.response &&
        (e?.message?.includes("Network") || e?.code === "ECONNREFUSED" || e?.code === "ERR_NETWORK");
      const isTimeout = e?.code === "ECONNABORTED" || e?.message?.includes("timeout");
      const baseHint = __DEV__ ? ` Trying: ${getApiBaseUrl()}` : "";
      const networkMsg = __DEV__
        ? `Cannot reach server. Check mobile/.env EXPO_PUBLIC_API_URL (same WiFi as backend; use Mac IP for local, or public URL for production).${baseHint}`
        : "Cannot reach server. Ensure the backend is online and reachable. The app was built with a fixed API URL (set EXPO_PUBLIC_API_URL in EAS when building); rebuild the app to change it.";
      setMsg(
        backendMsg ||
          (isNetwork
            ? networkMsg
            : isTimeout
              ? "Request timed out. Check backend is running and EXPO_PUBLIC_API_URL in mobile/.env."
              : "Failed to send OTP. Check backend logs and mobile/.env API URL.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.background}>
      <LinearGradient colors={LANDING_GRADIENT} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <View style={s.overlay} pointerEvents="none" />
      <KeyboardAvoidingView
        style={s.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={[s.scrollContent, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxxl }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            style={({ pressed }) => [s.backWrap, pressed && { opacity: 0.7 }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            <Text style={s.backText}>Back</Text>
          </Pressable>

          <View style={s.header}>
            <Image source={LOGO} style={s.logo} resizeMode="contain" />
            <View style={s.brandRow}>
              <Text style={s.brandDigital}>Digital</Text>
              <Text style={s.brandHouse}> House</Text>
            </View>
            <View style={s.taglineRow}>
              <View style={s.line} />
              <Text style={s.tagline}>Sign in to your account</Text>
              <View style={s.line} />
            </View>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Login</Text>
            <Text style={s.cardSubtitle}>Choose how you want to sign in</Text>

            <Pressable
              style={({ pressed }) => [
                s.googleBtn,
                pressed && s.btnPressed,
                (googleLoading || loading || !googleAvailable) && s.btnDisabled
              ]}
              onPress={() => void onGoogleSignIn()}
              disabled={googleLoading || loading || !googleAvailable}
            >
              {googleLoading ? (
                <ActivityIndicator size="small" color="#111827" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color="#EA4335" />
                  <Text style={s.googleBtnText}>Continue with Google</Text>
                </>
              )}
            </Pressable>
            {isExpoGo ? (
              <Text style={s.googleHint}>{EXPO_GO_GOOGLE_MESSAGE}</Text>
            ) : !googleConfigured ? (
              <Text style={s.googleHint}>
                Google Sign-In is not configured. Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to mobile/.env.
              </Text>
            ) : !googleReady ? (
              <Text style={s.googleHint}>Preparing Google Sign-In…</Text>
            ) : null}

            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>OR</Text>
              <View style={s.dividerLine} />
            </View>

            <Text style={s.existingLabel}>Existing login (email OTP)</Text>

            <Input
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              variant="light"
              editable={!loading}
              leftIcon={<Ionicons name="mail-outline" size={ICON_SIZE} color={ICON_COLOR} />}
            />

            <View style={s.messageWrap}>
              {msg ? (
                <Text style={msg.includes("sent") ? s.messageSuccess : s.messageError}>{msg}</Text>
              ) : null}
            </View>

            <Pressable
              style={({ pressed }) => [s.btnWrap, pressed && s.btnPressed, loading && s.btnDisabled]}
              onPress={onSend}
              disabled={loading}
            >
              <LinearGradient
                colors={["#2563EB", "#F97316"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.loginBtn}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={s.loginBtnText}>Send OTP</Text>
                )}
              </LinearGradient>
            </Pressable>
            <Text style={s.loginHint}>Login only after your account is approved by admin.</Text>

            <Pressable
              style={({ pressed }) => [s.registerWrap, pressed && { opacity: 0.8 }]}
              onPress={() => navigation.navigate("Registration")}
            >
              <Text style={s.registerText}>Don't have an account? </Text>
              <Text style={s.registerLink}>Register</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  background: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)"
  },
  keyboard: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl
  },
  backWrap: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
    marginBottom: spacing.sm
  },
  backText: {
    fontSize: 16,
    color: "#FFFFFF",
    marginLeft: spacing.xs
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl
  },
  logo: {
    width: Math.min(SCREEN_WIDTH * 0.4, 160),
    height: Math.min(SCREEN_HEIGHT * 0.12, 56),
    marginBottom: spacing.sm
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: spacing.md
  },
  brandDigital: {
    fontSize: 22,
    fontWeight: "600",
    color: "#2563EB"
  },
  brandHouse: {
    fontSize: 22,
    fontWeight: "600",
    color: "#F97316"
  },
  taglineRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(107,114,128,0.4)",
    marginHorizontal: spacing.sm
  },
  tagline: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "400"
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: spacing.xxl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: spacing.xs
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: spacing.lg
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF"
  },
  googleBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827"
  },
  googleHint: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: spacing.sm
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.lg,
    gap: spacing.sm
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB"
  },
  dividerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 1
  },
  existingLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: spacing.sm
  },
  messageWrap: {
    minHeight: 24,
    marginBottom: spacing.sm,
    justifyContent: "center"
  },
  messageSuccess: {
    fontSize: 14,
    color: "#22C55E"
  },
  messageError: {
    fontSize: 14,
    color: "#EF4444"
  },
  btnWrap: {
    width: "100%",
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4
  },
  btnPressed: { opacity: 0.9 },
  btnDisabled: { opacity: 0.85 },
  loginBtn: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  loginBtnText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF"
  },
  loginHint: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: spacing.md
  },
  registerWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  registerText: {
    fontSize: 15,
    color: "#6B7280"
  },
  registerLink: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2563EB"
  }
});
