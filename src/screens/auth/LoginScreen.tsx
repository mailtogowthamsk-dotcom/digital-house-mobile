import React, { Component, useState, type ErrorInfo, type ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  Keyboard,
  StatusBar
} from "react-native";
import { AppKeyboardAvoidingView } from "../../components/ui/AppKeyboardAvoidingView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { googleAuth, loginRequest } from "../../api/auth.api";
import { getApiBaseUrl, getAuthErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import {
  EXPO_GO_GOOGLE_MESSAGE,
  NATIVE_GOOGLE_MISSING_MESSAGE,
  useGoogleSignIn
} from "../../hooks/useGoogleSignIn";
import { Input } from "../../components/ui/Input";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { spacing } from "../../theme/spacing";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const LOGO = require("../../../assets/logo_digital_house.png");
const LANDING_GRADIENT = ["#0B1220", "#1a2744", "#0d1829"] as const;

const ICON_COLOR = "#6B7280";
const ICON_SIZE = 20;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Isolates Google AuthSession crashes so email OTP login still works in preview builds. */
class LoginGoogleBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[LoginScreen] Google auth init failed:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export function LoginScreen(props: any) {
  return (
    <LoginGoogleBoundary fallback={<LoginScreenEmailOnly {...props} />}>
      <LoginScreenInner {...props} />
    </LoginGoogleBoundary>
  );
}

function LoginScreenEmailOnly({ navigation }: any) {
  return (
    <LoginScreenBody
      navigation={navigation}
      google={{
        available: false,
        configured: false,
        isExpoGo: false,
        nativePresent: false,
        ready: false,
        hint: "Google Sign-In unavailable in this build. Use email OTP below.",
        onGoogleSignIn: async () => {},
        googleLoading: false
      }}
    />
  );
}

function LoginScreenInner({ navigation }: any) {
  const {
    signIn: getGoogleToken,
    configured: googleConfigured,
    available: googleAvailable,
    isExpoGo,
    nativePresent,
    ready: googleReady
  } = useGoogleSignIn();
  const { signIn } = useAuth();
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
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { message?: string } }; message?: string };
      const status = err.response?.status;
      if (status === 403) {
        setMsg(err.response?.data?.message ?? "Unable to sign in with this account.");
        return;
      }
      if (status === 401 && err.response?.data?.message) {
        setMsg(err.response.data.message);
        return;
      }
      setMsg(getAuthErrorMessage(e));
    } finally {
      setGoogleLoading(false);
    }
  };

  let hint: string | null = null;
  if (isExpoGo) hint = EXPO_GO_GOOGLE_MESSAGE;
  else if (!nativePresent) hint = NATIVE_GOOGLE_MISSING_MESSAGE;
  else if (!googleConfigured) {
    hint =
      "Google Sign-In is not configured in this build. Reinstall the latest preview build from EAS.";
  } else if (!googleReady) hint = "Preparing Google Sign-In…";

  return (
    <LoginScreenBody
      navigation={navigation}
      externalMsg={msg}
      google={{
        available: googleAvailable,
        configured: googleConfigured,
        isExpoGo,
        nativePresent,
        ready: googleReady,
        hint,
        onGoogleSignIn,
        googleLoading
      }}
    />
  );
}

type GoogleUi = {
  available: boolean;
  configured: boolean;
  isExpoGo: boolean;
  nativePresent: boolean;
  ready: boolean;
  hint: string | null;
  onGoogleSignIn: () => void | Promise<void>;
  googleLoading: boolean;
};

function LoginScreenBody({
  navigation,
  google,
  externalMsg
}: {
  navigation: any;
  google: GoogleUi;
  externalMsg?: string | null;
}) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  /** Local OTP messages win over Google errors from the parent. */
  const shownMsg = msg ?? externalMsg ?? null;

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
      const result = await loginRequest(email.trim());
      const normalizedEmail = email.trim().toLowerCase();
      if (result.sent === false) {
        setMsg(result.message || "A code was already sent. Check your email.");
        navigation.navigate("OtpVerify", { email: normalizedEmail });
        return;
      }
      navigation.navigate("OtpVerify", { email: normalizedEmail });
    } catch (e: any) {
      const status = e?.response?.status;
      const backendMsg = e?.response?.data?.message ?? "";
      if (status === 403) {
        // Suspended / blocked — show message; do not send to Pending without a session.
        setMsg(backendMsg || "Unable to sign in with this account.");
        return;
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
      <AppKeyboardAvoidingView
        style={s.keyboard}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={[
            s.scrollContent,
            { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxxl }
          ]}
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
                (google.googleLoading || loading || !google.available) && s.btnDisabled
              ]}
              onPress={() => void google.onGoogleSignIn()}
              disabled={google.googleLoading || loading || !google.available}
            >
              {google.googleLoading ? (
                <ActivityIndicator size="small" color="#111827" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color="#EA4335" />
                  <Text style={s.googleBtnText}>Continue with Google</Text>
                </>
              )}
            </Pressable>
            {google.hint ? <Text style={s.googleHint}>{google.hint}</Text> : null}

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
              variant="onWhite"
              editable={!loading}
              leftIcon={<Ionicons name="mail-outline" size={ICON_SIZE} color={ICON_COLOR} />}
            />

            <View style={s.messageWrap}>
              {shownMsg ? (
                <Text style={shownMsg.includes("sent") ? s.messageSuccess : s.messageError}>
                  {shownMsg}
                </Text>
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
            <Text style={s.loginHint}>
              After OTP, you'll be routed by your registration status (Home, Waiting, or Corrections).
            </Text>

            <Pressable
              style={({ pressed }) => [s.registerWrap, pressed && { opacity: 0.8 }]}
              onPress={() => navigation.navigate("Registration")}
            >
              <Text style={s.registerText}>Don't have an account? </Text>
              <Text style={s.registerLink}>Register</Text>
            </Pressable>
          </View>
        </ScrollView>
      </AppKeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  background: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.2)"
  },
  keyboard: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    // Avoid justifyContent:"center" — with Android keyboard resize it can
    // jump the focused field and feel like the keyboard is fighting focus.
    justifyContent: "flex-start"
  },
  backWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginBottom: spacing.md,
    paddingVertical: 4
  },
  backText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  header: { alignItems: "center", marginBottom: spacing.lg },
  logo: {
    width: Math.min(SCREEN_WIDTH * 0.32, 132),
    height: Math.min(SCREEN_WIDTH * 0.32, 132)
  },
  brandRow: { flexDirection: "row", alignItems: "baseline", marginTop: spacing.sm },
  brandDigital: { fontSize: 28, fontWeight: "800", color: "#FFFFFF" },
  brandHouse: { fontSize: 28, fontWeight: "800", color: "#F97316" },
  taglineRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    gap: 10
  },
  line: { height: 1, width: 28, backgroundColor: "rgba(255,255,255,0.35)" },
  tagline: { color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: "500" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: spacing.lg,
    maxWidth: 440,
    width: "100%",
    alignSelf: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6
  },
  cardTitle: { fontSize: 22, fontWeight: "800", color: "#111827" },
  cardSubtitle: { marginTop: 4, marginBottom: spacing.md, fontSize: 14, color: "#6B7280" },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 14
  },
  googleBtnText: { fontSize: 15, fontWeight: "700", color: "#111827" },
  googleHint: { marginTop: 8, fontSize: 12, lineHeight: 17, color: "#6B7280" },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.md,
    gap: 10
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E5E7EB" },
  dividerText: { fontSize: 12, fontWeight: "700", color: "#9CA3AF" },
  existingLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: spacing.sm
  },
  messageWrap: { minHeight: 22, marginTop: spacing.sm, marginBottom: spacing.sm },
  messageError: { fontSize: 13, color: "#DC2626", fontWeight: "600" },
  messageSuccess: { fontSize: 13, color: "#059669", fontWeight: "600" },
  btnWrap: { borderRadius: 12, overflow: "hidden" },
  btnPressed: { opacity: 0.92 },
  btnDisabled: { opacity: 0.55 },
  loginBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14
  },
  loginBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  loginHint: { marginTop: spacing.sm, fontSize: 12, color: "#6B7280", textAlign: "center" },
  registerWrap: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.md,
    flexWrap: "wrap"
  },
  registerText: { fontSize: 14, color: "#6B7280" },
  registerLink: { fontSize: 14, fontWeight: "700", color: "#2563EB" }
});
