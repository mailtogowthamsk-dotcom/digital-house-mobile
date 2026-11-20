import React, { Component, useState, type ErrorInfo, type ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
  Image,
  useWindowDimensions,
  ActivityIndicator,
  Keyboard,
  StatusBar,
  KeyboardAvoidingView
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { googleAuth, loginRequest } from "../../api/auth.api";
import { getAuthErrorMessage, sanitizeUserFacingError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import {
  EXPO_GO_GOOGLE_MESSAGE,
  NATIVE_GOOGLE_MISSING_MESSAGE,
  useGoogleSignIn
} from "../../hooks/useGoogleSignIn";
import { Input } from "../../components/ui/Input";
import { LinearGradient } from "expo-linear-gradient";
import { Image as ExpoImage } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";
import { spacing, radius } from "../../theme/spacing";
import { fonts } from "../../theme/fonts";
import { elevatedShadow } from "../../theme/shadows";

const BRAND_PRIMARY = "#14563F";
const BRAND_DEEP = "#163E31";

const LOGO = require("../../../assets/logo_digital_house.png");
const SCENERY = require("../../../assets/landing_scenery.jpg");
const LANDING_GRADIENT = [
  "rgba(255,248,233,0.48)",
  "rgba(252,248,239,0.84)",
  "rgba(228,240,229,0.62)"
] as const;

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
  const { width, height } = useWindowDimensions();
  const logoSize = Math.min(width * 0.24, height * 0.12, 88);
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
    } catch (e: unknown) {
      const ax = e as { response?: { status?: number; data?: { message?: string } } };
      const status = ax?.response?.status;
      if (status === 404) {
        const backend = ax.response?.data?.message?.trim();
        setMsg(
          backend
            ? sanitizeUserFacingError(backend)
            : "No account found. Please register first."
        );
        return;
      }
      setMsg(getAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Android already uses softwareKeyboardLayoutMode:"resize". Extra keyboard
   * padding (AppKeyboardAvoidingView androidPad) double-shrinks the viewport and
   * leaves a blank band above the IME — especially in Expo Go. Keep the
   * same visible Login UI; only avoid double inset. iOS still needs KAV padding.
   */
  const scroll = (
    <ScrollView
      style={s.keyboard}
      contentContainerStyle={[
        s.scrollContent,
        { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xl }
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
    >
      <Pressable
        style={({ pressed }) => [s.backWrap, pressed && { opacity: 0.7 }]}
        onPress={() => navigation.goBack()}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="chevron-back-outline" size={23} color={BRAND_DEEP} />
      </Pressable>

      <View style={s.header}>
        <Image source={LOGO} style={{ width: logoSize, height: logoSize }} resizeMode="contain" />
        <Text style={s.brandTitle}>Digital House</Text>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle} accessibilityRole="header">Sign in</Text>

        <Pressable
          style={({ pressed }) => [
            s.googleBtn,
            pressed && s.btnPressed,
            (google.googleLoading || loading || !google.available) && s.btnDisabled
          ]}
          onPress={() => void google.onGoogleSignIn()}
          disabled={google.googleLoading || loading || !google.available}
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
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

        <Text style={s.existingLabel}>Sign in with email</Text>
        <Text style={s.emailHelper}>Enter your email to receive a one-time password.</Text>

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

        {shownMsg ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[s.message, shownMsg.includes("sent") ? s.messageSuccess : s.messageError]}
          >
            {shownMsg}
          </Text>
        ) : null}

        <Pressable
          style={({ pressed }) => [s.loginBtn, pressed && s.btnPressed, loading && s.btnDisabled]}
          onPress={onSend}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Send OTP"
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={s.loginBtnText}>Send OTP</Text>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [s.registerWrap, pressed && { opacity: 0.8 }]}
          onPress={() => navigation.navigate("Registration")}
          accessibilityRole="button"
        >
          <Text style={s.registerText}>Don't have an account? </Text>
          <Text style={s.registerLink}>Register</Text>
        </Pressable>
      </View>
    </ScrollView>
  );

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
      <LinearGradient colors={LANDING_GRADIENT} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      {Platform.OS === "ios" ? (
        <KeyboardAvoidingView style={s.keyboard} behavior="padding" keyboardVerticalOffset={0}>
          {scroll}
        </KeyboardAvoidingView>
      ) : (
        <View style={s.keyboard}>{scroll}</View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  background: { flex: 1, backgroundColor: "#FCF8EF" },
  keyboard: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    // Avoid justifyContent:"center" — with Android keyboard resize it can
    // jump the focused field and feel like the keyboard is fighting focus.
    justifyContent: "flex-start"
  },
  backWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#DCE7DF",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start"
  },
  header: { alignItems: "center", marginBottom: spacing.lg },
  brandTitle: {
    marginTop: spacing.xs,
    fontFamily: fonts.bold,
    fontSize: 22,
    color: BRAND_DEEP
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#DCE7DF",
    padding: spacing.lg,
    maxWidth: 440,
    width: "100%",
    alignSelf: "center",
    ...elevatedShadow("light")
  },
  cardTitle: {
    marginBottom: spacing.md,
    fontFamily: fonts.bold,
    fontSize: 22,
    color: BRAND_DEEP
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: radius.button,
    minHeight: 48
  },
  googleBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    fontWeight: "600",
    color: "#111827"
  },
  googleHint: {
    marginTop: 8,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: "#6B7280"
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.md,
    gap: 12
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: "#E5E7EB" },
  dividerText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280"
  },
  existingLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4
  },
  emailHelper: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 17,
    marginBottom: spacing.md
  },
  message: { marginTop: spacing.sm },
  messageError: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "500"
  },
  messageSuccess: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: BRAND_PRIMARY,
    fontWeight: "500"
  },
  btnPressed: { opacity: 0.9 },
  btnDisabled: { opacity: 0.55 },
  loginBtn: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    borderRadius: radius.button,
    backgroundColor: BRAND_PRIMARY,
    marginTop: spacing.md,
    paddingVertical: 10
  },
  loginBtnText: {
    fontFamily: fonts.semiBold,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600"
  },
  registerWrap: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.lg,
    flexWrap: "wrap",
    minHeight: 44,
    alignItems: "center"
  },
  registerText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: "#6B7280"
  },
  registerLink: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    fontWeight: "600",
    color: BRAND_PRIMARY
  }
});
