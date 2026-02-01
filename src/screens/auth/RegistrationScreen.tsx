import React, { useState, useEffect } from "react";
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
  Keyboard
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { register as registerApi, type RegisterPayload } from "../../api/auth.api";
import { getAuthErrorMessage } from "../../api/client";
import { getLocations, getKulams } from "../../api/options.api";
import { Input } from "../../components/ui/Input";
import { Dropdown } from "../../components/ui/Dropdown";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { spacing } from "../../theme/spacing";
import { GENDER_OPTIONS, LOCATION_OPTIONS, KULAM_OPTIONS } from "./registrationOptions";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const LOGO = require("../../../assets/logo_digital_house.png");
const LANDING_GRADIENT = ["#0B1220", "#1a2744", "#0d1829"];
const ICON_COLOR = "#6B7280";
const ICON_SIZE = 20;
const STEPS = ["Personal", "Contact", "Community", "Review"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatDate(d: Date | null): string {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function RegistrationScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState<Date | null>(null);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [occupation, setOccupation] = useState("");
  const [location, setLocation] = useState("");
  const [community, setCommunity] = useState("");
  const [kulam, setKulam] = useState("");
  const [locationOptions, setLocationOptions] = useState<{ label: string; value: string }[]>(LOCATION_OPTIONS);
  const [kulamOptions, setKulamOptions] = useState<{ label: string; value: string }[]>(KULAM_OPTIONS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [locations, kulams] = await Promise.all([getLocations(), getKulams()]);
        if (!cancelled) {
          if (locations.length > 0) {
            setLocationOptions(locations.map((l) => ({ label: l.name, value: l.name })));
          }
          if (kulams.length > 0) {
            setKulamOptions(kulams.map((k) => ({ label: k.name, value: k.name })));
          }
        }
      } catch {
        if (!cancelled) {
          setLocationOptions(LOCATION_OPTIONS);
          setKulamOptions(KULAM_OPTIONS);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const canNextStep0 = fullName.trim().length > 0;
  const canNextStep1 =
    email.trim().length > 0 &&
    EMAIL_REGEX.test(email.trim()) &&
    mobile.trim().length >= 10;
  const canNextStep2 = location.trim().length > 0 && kulam.trim().length > 0;
  const canNext =
    step === 0 ? canNextStep0 : step === 1 ? canNextStep1 : step === 2 ? canNextStep2 : true;

  const onNext = () => {
    Keyboard.dismiss();
    setMsg(null);
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const onBack = () => {
    Keyboard.dismiss();
    setMsg(null);
    if (step > 0) setStep(step - 1);
    else navigation.goBack();
  };

  const onSubmit = async () => {
    Keyboard.dismiss();
    setMsg(null);
    if (!fullName.trim()) {
      setMsg("Please enter your full name.");
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setMsg("Please enter a valid email.");
      return;
    }
    if (!mobile.trim() || mobile.trim().length < 10) {
      setMsg("Please enter a valid mobile number (at least 10 digits).");
      return;
    }
    if (!location.trim()) {
      setMsg("Please select your location.");
      return;
    }
    if (!kulam.trim()) {
      setMsg("Please select your kulam.");
      return;
    }
    setLoading(true);
    try {
      const payload: RegisterPayload = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        gender: gender.trim() || null,
        dob: dob ? formatDate(dob) : null,
        mobile: mobile.trim(),
        occupation: occupation.trim() || null,
        location: location.trim(),
        community: community.trim() || null,
        kulam: kulam.trim()
      };
      await registerApi(payload);
      navigation.replace("PendingApproval");
    } catch (e: any) {
      setMsg(getAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.background}>
      <LinearGradient colors={LANDING_GRADIENT} style={StyleSheet.absoluteFill} />
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
          <Pressable style={({ pressed }) => [s.backWrap, pressed && { opacity: 0.7 }]} onPress={onBack}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            <Text style={s.backText}>{step === 0 ? "Back" : "Previous"}</Text>
          </Pressable>

          <View style={s.header}>
            <Image source={LOGO} style={s.logo} resizeMode="contain" />
            <View style={s.brandRow}>
              <Text style={s.brandDigital}>Digital</Text>
              <Text style={s.brandHouse}> House</Text>
            </View>
            <View style={s.progressRow}>
              {STEPS.map((_, i) => (
                <View
                  key={i}
                  style={[s.progressDot, i <= step && s.progressDotActive, i < step && s.progressDotDone]}
                />
              ))}
            </View>
            <Text style={s.stepTitle}>{STEPS[step]}</Text>
          </View>

          <View style={s.card}>
            {step === 0 && (
              <>
                <Input
                  placeholder="Full name *"
                  value={fullName}
                  onChangeText={setFullName}
                  variant="light"
                  leftIcon={<Ionicons name="person-outline" size={ICON_SIZE} color={ICON_COLOR} />}
                />
                <Dropdown
                  placeholder="Select gender"
                  value={gender}
                  options={GENDER_OPTIONS}
                  onSelect={setGender}
                  variant="light"
                />
                <Pressable
                  style={s.dateRow}
                  onPress={() => setShowDobPicker(true)}
                >
                  <Text style={[s.dateText, !dob && s.datePlaceholder]}>
                    {dob ? formatDate(dob) : "Select date of birth"}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color={ICON_COLOR} />
                </Pressable>
                {showDobPicker && (
                  <DateTimePicker
                    value={dob || new Date(2000, 0, 1)}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    maximumDate={new Date()}
                    onChange={(_, selected) => {
                      if (Platform.OS === "android") setShowDobPicker(false);
                      if (selected) setDob(selected);
                    }}
                  />
                )}
                {Platform.OS === "ios" && showDobPicker && (
                  <Pressable style={s.dateDone} onPress={() => setShowDobPicker(false)}>
                    <Text style={s.dateDoneText}>Done</Text>
                  </Pressable>
                )}
              </>
            )}
            {step === 1 && (
              <>
                <Input
                  placeholder="Email *"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  variant="light"
                  leftIcon={<Ionicons name="mail-outline" size={ICON_SIZE} color={ICON_COLOR} />}
                />
                <Input
                  placeholder="Mobile number * (min 10 digits)"
                  value={mobile}
                  onChangeText={setMobile}
                  keyboardType="phone-pad"
                  variant="light"
                  leftIcon={<Ionicons name="call-outline" size={ICON_SIZE} color={ICON_COLOR} />}
                />
              </>
            )}
            {step === 2 && (
              <>
                <Input
                  placeholder="Occupation (optional)"
                  value={occupation}
                  onChangeText={setOccupation}
                  variant="light"
                />
                <Dropdown
                  placeholder="Select location *"
                  value={location}
                  options={locationOptions}
                  onSelect={setLocation}
                  variant="light"
                  required
                />
                <Input
                  placeholder="Community (optional)"
                  value={community}
                  onChangeText={setCommunity}
                  variant="light"
                />
                <Dropdown
                  placeholder="Select kulam *"
                  value={kulam}
                  options={kulamOptions}
                  onSelect={setKulam}
                  variant="light"
                  required
                />
              </>
            )}
            {step === 3 && (
              <>
                <Text style={s.reviewLabel}>Full name</Text>
                <Text style={s.reviewValue}>{fullName || "—"}</Text>
                <Text style={s.reviewLabel}>Email</Text>
                <Text style={s.reviewValue}>{email || "—"}</Text>
                <Text style={s.reviewLabel}>Mobile</Text>
                <Text style={s.reviewValue}>{mobile || "—"}</Text>
                <Text style={s.reviewLabel}>Location</Text>
                <Text style={s.reviewValue}>{location || "—"}</Text>
                <Text style={s.reviewLabel}>Kulam</Text>
                <Text style={s.reviewValue}>{kulam || "—"}</Text>
                <Text style={s.reviewHint}>Your account will be reviewed by an admin (1–2 days). No password needed—login with OTP after approval.</Text>
              </>
            )}

            <View style={s.messageWrap}>
              {msg ? <Text style={s.messageError}>{msg}</Text> : null}
            </View>

            {step < STEPS.length - 1 ? (
              <Pressable
                style={({ pressed }) => [s.btnWrap, pressed && s.btnPressed, !canNext && s.btnDisabled]}
                onPress={onNext}
                disabled={!canNext}
              >
                <LinearGradient
                  colors={["#2563EB", "#F97316"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.btn}
                >
                  <Text style={s.btnText}>Next</Text>
                </LinearGradient>
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [s.btnWrap, pressed && s.btnPressed, loading && s.btnDisabled]}
                onPress={onSubmit}
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
                    <Text style={s.btnText}>Submit registration</Text>
                  )}
                </LinearGradient>
              </Pressable>
            )}

            <Pressable
              style={({ pressed }) => [s.loginWrap, pressed && { opacity: 0.8 }]}
              onPress={() => navigation.navigate("Login")}
            >
              <Text style={s.loginText}>Already have an account? </Text>
              <Text style={s.loginLink}>Login</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  background: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.2)" },
  keyboard: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: spacing.xl },
  backWrap: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
    marginBottom: spacing.sm
  },
  backText: { fontSize: 16, color: "#FFFFFF", marginLeft: spacing.xs },
  header: { alignItems: "center", marginBottom: spacing.xl },
  logo: {
    width: Math.min(SCREEN_WIDTH * 0.35, 140),
    height: 50,
    marginBottom: spacing.sm
  },
  brandRow: { flexDirection: "row", alignItems: "baseline", marginBottom: spacing.md },
  brandDigital: { fontSize: 20, fontWeight: "600", color: "#2563EB" },
  brandHouse: { fontSize: 20, fontWeight: "600", color: "#F97316" },
  progressRow: { flexDirection: "row", gap: 8, marginBottom: spacing.sm },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.5)"
  },
  progressDotActive: { backgroundColor: "#2563EB" },
  progressDotDone: { backgroundColor: "#22C55E" },
  stepTitle: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
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
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    minHeight: 52,
    paddingHorizontal: 16,
    marginBottom: spacing.lg
  },
  dateText: { fontSize: 16, color: "#111827" },
  datePlaceholder: { color: "#9CA3AF" },
  dateDone: { paddingVertical: spacing.sm, alignItems: "flex-end", marginBottom: spacing.lg },
  dateDoneText: { fontSize: 16, fontWeight: "600", color: "#2563EB" },
  reviewLabel: { fontSize: 12, color: "#6B7280", marginTop: spacing.sm },
  reviewValue: { fontSize: 16, color: "#111827", marginBottom: spacing.xs },
  reviewHint: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 20,
    marginTop: spacing.lg,
    marginBottom: spacing.md
  },
  messageWrap: { minHeight: 24, marginBottom: spacing.sm },
  messageError: { fontSize: 14, color: "#EF4444" },
  btnWrap: { width: "100%", marginTop: spacing.sm, marginBottom: spacing.lg },
  btnPressed: { opacity: 0.9 },
  btnDisabled: { opacity: 0.7 },
  btn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  btnText: { fontSize: 17, fontWeight: "600", color: "#FFFFFF" },
  loginWrap: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  loginText: { fontSize: 15, color: "#6B7280" },
  loginLink: { fontSize: 15, fontWeight: "600", color: "#2563EB" }
});
