import React, { useState, useRef } from "react";
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
  TextInput,
  StatusBar
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { verifyOtp } from "../../api/auth.api";
import { setToken } from "../../storage/token.storage";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { spacing } from "../../theme/spacing";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const LOGO = require("../../../assets/logo_digital_house.png");
const LANDING_GRADIENT = ["#0B1220", "#1a2744", "#0d1829"];
const OTP_LENGTH = 6;
const BOX_SIZE = 48;
const BOX_GAP = 10;

export function OtpVerifyScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const email = route.params.email as string;
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const setOtpValue = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, OTP_LENGTH);
    setOtp(digits);
    setMsg(null);
  };

  const onVerify = async () => {
    Keyboard.dismiss();
    setMsg(null);
    if (otp.length < OTP_LENGTH) {
      setMsg("Please enter the 6-digit code from your email.");
      return;
    }
    setLoading(true);
    try {
      const res = await verifyOtp(email, otp);
      await setToken(res.accessToken);
      navigation.reset({ index: 0, routes: [{ name: "Home" }] });
    } catch (e: any) {
      setMsg(e?.response?.data?.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const focusInput = () => inputRef.current?.focus();

  return (
    <View style={s.background}>
      <LinearGradient colors={LANDING_GRADIENT} style={StyleSheet.absoluteFill} />
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <View style={s.overlay} />
      <KeyboardAvoidingView
        style={s.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
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
              <Text style={s.tagline}>Verify your email</Text>
              <View style={s.line} />
            </View>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Enter verification code</Text>
            <Text style={s.cardSubtitle}>We sent a 6-digit code to</Text>
            <View style={s.emailRow}>
              <Ionicons name="mail-outline" size={18} color="#2563EB" />
              <Text style={s.emailText}>{email}</Text>
            </View>

            {/* Hidden input for keyboard; tap boxes to focus */}
            <TextInput
              ref={inputRef}
              value={otp}
              onChangeText={setOtpValue}
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              editable={!loading}
              autoFocus
              style={s.hiddenInput}
              accessibilityLabel="OTP code input"
            />

            <Pressable style={s.otpBoxRow} onPress={focusInput}>
              {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    s.otpBox,
                    otp.length === i && s.otpBoxFocused,
                    otp.length > i && s.otpBoxFilled
                  ]}
                >
                  <Text style={s.otpBoxDigit}>{otp[i] ?? ""}</Text>
                  {otp.length === i ? <View style={s.otpCursor} /> : null}
                </View>
              ))}
            </Pressable>
            <Text style={s.otpHint}>Tap to enter code</Text>

            <View style={s.messageWrap}>
              {msg ? <Text style={s.messageError}>{msg}</Text> : null}
            </View>

            <Pressable
              style={({ pressed }) => [s.btnWrap, pressed && s.btnPressed, loading && s.btnDisabled]}
              onPress={onVerify}
              disabled={loading}
            >
              <LinearGradient
                colors={["#2563EB", "#F97316"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.btn}
              >
                {loading ? (
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
            >
              <Text style={s.resendText}>Didn’t get the code? </Text>
              <Text style={s.resendLink}>Go back & request again</Text>
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
    marginBottom: spacing.xs
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.xxl
  },
  emailText: {
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
    gap: BOX_GAP,
    marginBottom: spacing.sm
  },
  otpBox: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderRadius: 14,
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
    fontSize: 22,
    fontWeight: "700",
    color: "#111827"
  },
  otpCursor: {
    position: "absolute",
    bottom: 10,
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
