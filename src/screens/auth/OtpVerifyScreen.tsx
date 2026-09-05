import React, { useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
  Keyboard,
  TextInput,
  StatusBar,
  useWindowDimensions
} from "react-native";
import { AppKeyboardAvoidingView } from "../../components/ui/AppKeyboardAvoidingView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { verifyOtp } from "../../api/auth.api";
import { getAuthErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { spacing } from "../../theme/spacing";

const LOGO = require("../../../assets/logo_digital_house.png");
const LANDING_GRADIENT = ["#0B1220", "#1a2744", "#0d1829"] as const;
const OTP_LENGTH = 6;

/** Fit 6 OTP cells + gaps inside the white card on any phone width. */
function computeOtpLayout(screenWidth: number) {
  const screenPad = spacing.xl * 2;
  const cardPad = spacing.lg * 2; // modest horizontal card padding for narrow Androids
  const available = Math.max(240, screenWidth - screenPad - cardPad);
  const gaps = OTP_LENGTH - 1;
  const maxBox = 52;
  const minBox = 36;
  let gap = 10;
  let box = Math.floor((available - gaps * gap) / OTP_LENGTH);

  if (box > maxBox) {
    box = maxBox;
    gap = Math.min(12, Math.floor((available - box * OTP_LENGTH) / gaps));
  } else if (box < minBox) {
    gap = Math.max(4, Math.floor((available - minBox * OTP_LENGTH) / gaps));
    box = Math.max(minBox, Math.floor((available - gaps * gap) / OTP_LENGTH));
  }

  gap = Math.max(4, Math.min(12, gap));
  box = Math.max(minBox, Math.min(maxBox, box));
  return { box, gap, digitSize: box >= 44 ? 22 : box >= 40 ? 20 : 18 };
}

export function OtpVerifyScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const otpLayout = useMemo(() => computeOtpLayout(screenWidth), [screenWidth]);
  const { signIn } = useAuth();
  const email = route.params.email as string;
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const verifyingRef = useRef(false);

  const setOtpValue = (value: string) => {
    if (verifyingRef.current || signedIn) return;
    const digits = value.replace(/\D/g, "").slice(0, OTP_LENGTH);
    setOtp(digits);
    setMsg(null);
  };

  const onVerify = async () => {
    Keyboard.dismiss();
    setMsg(null);
    if (verifyingRef.current || signedIn || loading) return;
    if (otp.length < OTP_LENGTH) {
      setMsg("Please enter the 6-digit code from your email.");
      return;
    }
    verifyingRef.current = true;
    setLoading(true);
    try {
      const res = await verifyOtp(email, otp);
      await signIn(res.accessToken, {
        ...res.user,
        createdAt: res.user.createdAt ?? new Date().toISOString()
      });
      setSignedIn(true);
    } catch (e: unknown) {
      verifyingRef.current = false;
      setLoading(false);
      setMsg(getAuthErrorMessage(e));
    }
  };

  const focusInput = () => inputRef.current?.focus();

  return (
    <View style={s.background}>
      <LinearGradient colors={LANDING_GRADIENT} style={StyleSheet.absoluteFill} />
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <View style={s.overlay} />
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
            <Image
              source={LOGO}
              style={{
                width: Math.min(screenWidth * 0.3, 120),
                height: Math.min(screenWidth * 0.3, 120),
                marginBottom: spacing.sm
              }}
              resizeMode="contain"
            />
            <View style={s.brandRow}>
              <Text style={s.brandDigital}>Digital</Text>
              <Text style={s.brandHouse}> House</Text>
            </View>
            <View style={s.taglineRow}>
              <View style={s.line} />
              <Text style={s.tagline}>Verify your email</Text>
              <View style={s.line} />
            </View>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Enter verification code</Text>
            <Text style={s.cardSubtitle}>We sent a 6-digit code to</Text>
            <View style={s.emailRow}>
              <Ionicons name="mail-outline" size={18} color="#2563EB" />
              <Text style={s.emailText} numberOfLines={1}>
                {email}
              </Text>
            </View>

            <TextInput
              ref={inputRef}
              value={otp}
              onChangeText={setOtpValue}
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              editable={!loading && !signedIn}
              autoFocus
              style={s.hiddenInput}
              accessibilityLabel="OTP code input"
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
            />

            <Pressable
              style={[s.otpBoxRow, { gap: otpLayout.gap }]}
              onPress={focusInput}
              disabled={loading || signedIn}
            >
              {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    s.otpBox,
                    {
                      width: otpLayout.box,
                      height: otpLayout.box,
                      borderRadius: Math.max(10, Math.round(otpLayout.box * 0.28))
                    },
                    otp.length === i && s.otpBoxFocused,
                    otp.length > i && s.otpBoxFilled
                  ]}
                >
                  <Text style={[s.otpBoxDigit, { fontSize: otpLayout.digitSize }]}>
                    {otp[i] ?? ""}
                  </Text>
                  {otp.length === i && !loading && !signedIn ? <View style={s.otpCursor} /> : null}
                </View>
              ))}
            </Pressable>
            <Text style={s.otpHint}>
              {signedIn ? "Signing you in…" : "Tap to enter code"}
            </Text>

            <View style={s.messageWrap}>
              {msg ? <Text style={s.messageError}>{msg}</Text> : null}
            </View>

            <Pressable
              style={({ pressed }) => [
                s.btnWrap,
                pressed && !loading && !signedIn && s.btnPressed,
                (loading || signedIn) && s.btnDisabled
              ]}
              onPress={onVerify}
              disabled={loading || signedIn}
            >
              <LinearGradient
                colors={["#2563EB", "#F97316"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.btn}
              >
                {loading || signedIn ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={s.btnText}>Verify & continue</Text>
                )}
              </LinearGradient>
            </Pressable>

            <Text style={s.expiryHint}>Code expires in 5 minutes.</Text>
            <Pressable
              style={({ pressed }) => [s.resendWrap, pressed && { opacity: 0.8 }]}
              onPress={() => navigation.goBack()}
              disabled={loading || signedIn}
            >
              <Text style={s.resendText}>Didn’t get the code? </Text>
              <Text style={s.resendLink}>Go back & request again</Text>
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
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    overflow: "hidden"
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
    marginBottom: spacing.xs
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.xxl,
    minWidth: 0
  },
  emailText: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: "600",
    color: "#2563EB"
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    width: 1,
    height: 1
  },
  otpBoxRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    alignSelf: "center",
    marginBottom: spacing.sm
  },
  otpBox: {
    backgroundColor: "#F3F4F6",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center"
  },
  otpBoxFocused: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF"
  },
  otpBoxFilled: {
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF"
  },
  otpBoxDigit: {
    fontWeight: "700",
    color: "#111827"
  },
  otpCursor: {
    position: "absolute",
    bottom: 8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#2563EB"
  },
  otpHint: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: spacing.xl
  },
  messageWrap: {
    minHeight: 28,
    marginBottom: spacing.sm,
    justifyContent: "center"
  },
  messageError: {
    fontSize: 14,
    color: "#EF4444",
    textAlign: "center"
  },
  btnWrap: {
    width: "100%",
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4
  },
  btnPressed: { opacity: 0.9 },
  btnDisabled: { opacity: 0.85 },
  btn: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  btnText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF"
  },
  expiryHint: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: spacing.xs
  },
  resendWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap"
  },
  resendText: {
    fontSize: 14,
    color: "#6B7280"
  },
  resendLink: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB"
  }
});
