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
  KeyboardAvoidingView,
  TextInput,
  StatusBar,
  useWindowDimensions
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { verifyOtp } from "../../api/auth.api";
import { getAuthErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image as ExpoImage } from "expo-image";
import { fonts } from "../../theme/fonts";
import { spacing } from "../../theme/spacing";

const LOGO = require("../../../assets/logo_digital_house.png");
const SCENERY = require("../../../assets/landing_scenery.jpg");
const BRAND_PRIMARY = "#14563F";
const BRAND_DEEP = "#163E31";
const LANDING_GRADIENT = [
  "rgba(255,248,233,0.48)",
  "rgba(252,248,239,0.84)",
  "rgba(228,240,229,0.62)"
] as const;
const OTP_LENGTH = 6;

/** Fit 6 OTP cells + gaps inside the white card on any phone width. */
function computeOtpLayout(screenWidth: number) {
  const screenPad = spacing.xl * 2;
  const cardPad = spacing.lg * 2 + 2;
  const available = Math.min(440, screenWidth - screenPad) - cardPad;
  const gaps = OTP_LENGTH - 1;
  const maxBox = 52;
  const minBox = 28;
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
  const { width: screenWidth, height } = useWindowDimensions();
  const logoSize = Math.min(screenWidth * 0.22, height * 0.10, 76);
  const otpLayout = useMemo(() => computeOtpLayout(screenWidth), [screenWidth]);
  const { signIn } = useAuth();
  const email = route.params.email as string;
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const verifyingRef = useRef(false);

  const onVerify = async (code: string) => {
    if (verifyingRef.current || signedIn || loading) return;
    if (code.length < OTP_LENGTH) return;
    verifyingRef.current = true;
    Keyboard.dismiss();
    setMsg(null);
    setLoading(true);
    try {
      const res = await verifyOtp(email, code);
      await signIn(res.accessToken, {
        ...res.user,
        createdAt: res.user.createdAt ?? new Date().toISOString()
      });
      setSignedIn(true);
    } catch (e: unknown) {
      verifyingRef.current = false;
      setLoading(false);
      setOtp("");
      setMsg(getAuthErrorMessage(e));
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const setOtpValue = (value: string) => {
    if (verifyingRef.current || signedIn) return;
    const digits = value.replace(/\D/g, "").slice(0, OTP_LENGTH);
    setOtp(digits);
    setMsg(null);
    if (digits.length === OTP_LENGTH) {
      void onVerify(digits);
    }
  };

  const focusInput = () => inputRef.current?.focus();

  // Same as Login: Android resize already shrinks the window — extra androidPad
  // creates a blank gap above the keyboard.
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
        accessibilityRole="button"
      >
        <Ionicons name="chevron-back-outline" size={22} color={BRAND_DEEP} />
        <Text style={s.backText}>Back</Text>
      </Pressable>

      <View style={s.header}>
        <Image source={LOGO} style={{ width: logoSize, height: logoSize }} resizeMode="contain" />
        <Text style={s.brandTitle}>Digital House</Text>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle} accessibilityRole="header">Verify your email</Text>
        <Text style={s.cardSubtitle}>We sent a 6-digit code to</Text>
        <View style={s.emailRow}>
          <Ionicons name="mail-outline" size={18} color={BRAND_PRIMARY} />
          <Text style={s.emailText}>
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
          {signedIn || loading
            ? "Signing you in…"
            : "Enter the 6-digit code — it submits automatically"}
        </Text>

        {(loading || signedIn) && !msg ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="small" color={BRAND_PRIMARY} />
          </View>
        ) : null}

        {msg ? <Text style={s.messageError} accessibilityLiveRegion="polite">{msg}</Text> : null}

        <Text style={s.expiryHint}>Code expires in 5 minutes.</Text>
        <Pressable
          style={({ pressed }) => [s.resendWrap, pressed && { opacity: 0.8 }]}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          disabled={loading || signedIn}
        >
          <Text style={s.resendLink}>Go back to request a new code</Text>
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
  scrollContent: { flexGrow: 1, paddingHorizontal: spacing.xl },
  backWrap: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#DCE7DF",
    backgroundColor: "#FFFFFF"
  },
  backText: { fontSize: 14, color: BRAND_DEEP, marginRight: spacing.xs },
  header: { alignItems: "center", marginBottom: spacing.md },
  brandTitle: { marginTop: spacing.xs, fontSize: 24, fontFamily: fonts.bold, color: BRAND_DEEP },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#DCE7DF",
    paddingVertical: spacing.lg,
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
    marginBottom: spacing.lg,
    minWidth: 0
  },
  emailText: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: "600",
    color: BRAND_PRIMARY
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
    borderColor: BRAND_PRIMARY,
    backgroundColor: "#EDF6EF"
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
    backgroundColor: BRAND_PRIMARY
  },
  otpHint: {
    fontSize: 13,
    color: "#52645B",
    textAlign: "center",
    marginBottom: spacing.md
  },
  loadingWrap: {
    alignItems: "center",
    marginBottom: spacing.sm
  },
  messageError: {
    fontSize: 14,
    color: "#B42318",
    marginBottom: spacing.sm,
    textAlign: "center"
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
    minHeight: 44
  },
  resendLink: {
    fontSize: 14,
    fontWeight: "600",
    color: BRAND_PRIMARY
  }
});
