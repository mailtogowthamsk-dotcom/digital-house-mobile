import React, { useState, useEffect, useCallback } from "react";
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
  Keyboard
} from "react-native";
import { AppKeyboardAvoidingView } from "../../components/ui/AppKeyboardAvoidingView";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { register as registerApi, setRegistrationPhoto, type RegisterPayload } from "../../api/auth.api";
import { getAuthErrorMessage } from "../../api/client";
import { getLocations, getKulams, getMasterItems, masterItemsToDropdown } from "../../api/options.api";
import { uploadOptimizedImage } from "../../utils/mediaUpload";
import { setToken } from "../../storage/token.storage";
import { useAuth } from "../../context/AuthContext";
import { Input } from "../../components/ui/Input";
import { Dropdown } from "../../components/ui/Dropdown";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { spacing } from "../../theme/spacing";
import { GENDER_OPTIONS, LOCATION_OPTIONS, KULAM_OPTIONS } from "./registrationOptions";
import { ensureMediaLibraryRead } from "../../permissions";
import {
  LEGAL_FALLBACK_LINKS,
  LEGAL_REGISTRATION_KEYS,
  listLegalCatalog,
  type LegalAcceptance,
  type LegalCatalogItem
} from "../../api/legal.api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const LOGO = require("../../../assets/logo_digital_house.png");
const LANDING_GRADIENT = ["#0B1220", "#1a2744", "#0d1829"] as const;
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
  const { signIn } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState<Date | null>(null);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [occupation, setOccupation] = useState("");
  const [location, setLocation] = useState("");
  const [kulam, setKulam] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [photoLocalUri, setPhotoLocalUri] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [locationOptions, setLocationOptions] = useState<{ label: string; value: string }[]>(LOCATION_OPTIONS);
  const [kulamOptions, setKulamOptions] = useState<{ label: string; value: string }[]>(KULAM_OPTIONS);
  const [occupationOptions, setOccupationOptions] = useState<{ label: string; value: string }[]>([]);
  const [legalDocs, setLegalDocs] = useState<LegalCatalogItem[]>([]);
  const [acceptedLegal, setAcceptedLegal] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [locations, kulams, occupations] = await Promise.all([
          getLocations(),
          getKulams(),
          getMasterItems("OCCUPATION")
        ]);
        if (!cancelled) {
          if (locations.length > 0) {
            setLocationOptions(locations.map((l) => ({ label: l.name, value: l.name })));
          }
          if (kulams.length > 0) {
            setKulamOptions(kulams.map((k) => ({ label: k.displayName || k.name, value: k.name })));
          }
          if (occupations.length > 0) {
            setOccupationOptions(masterItemsToDropdown(occupations));
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const catalog = await listLegalCatalog();
        if (cancelled) return;
        // Prefer API `requiredAtRegistration`; fall back to known registration keys.
        let required = catalog.filter((d) => d.requiredAtRegistration && d.version);
        if (!required.length) {
          required = catalog.filter(
            (d) =>
              d.version &&
              (LEGAL_REGISTRATION_KEYS as readonly string[]).includes(d.documentKey)
          );
        }
        // Only show mandatory checkboxes when published versions exist.
        // If catalog is empty (nothing published), do not block registration.
        if (required.length) {
          setLegalDocs(required);
          return;
        }
        const fallbackLabels = LEGAL_FALLBACK_LINKS.filter((d) =>
          (LEGAL_REGISTRATION_KEYS as readonly string[]).includes(d.documentKey)
        );
        setLegalDocs(
          fallbackLabels.map((d) => ({
            ...d,
            description: null,
            version: "",
            publishedAt: null,
            requiredAtRegistration: true,
            requiresReacceptance: false,
            sortOrder: 0
          }))
        );
      } catch {
        if (!cancelled) {
          setLegalDocs(
            LEGAL_FALLBACK_LINKS.filter((d) =>
              (LEGAL_REGISTRATION_KEYS as readonly string[]).includes(d.documentKey)
            ).map((d) => ({
              ...d,
              description: null,
              version: "",
              publishedAt: null,
              requiredAtRegistration: true,
              requiresReacceptance: false,
              sortOrder: 0
            }))
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pickPhoto = useCallback(async () => {
    const permission = await ensureMediaLibraryRead({
      rationaleTitle: "Add a profile photo",
      rationaleMessage:
        "Digital House needs access to your photos so you can choose a profile picture during registration."
    });
    if (!permission.ok) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    setPhotoLocalUri(result.assets[0].uri);
    setMsg(null);
  }, []);

  const canNextStep0 = fullName.trim().length > 0 && username.trim().length >= 3;
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
    if (step === 2) {
      if (!location.trim()) {
        setMsg("Please select your location.");
        return;
      }
      if (!kulam.trim()) {
        setMsg("Please select your Kulam.");
        return;
      }
    }
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
    if (username.trim().length < 3) {
      setMsg("Please choose a username (at least 3 characters).");
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
      setMsg("Please select your Kulam.");
      return;
    }

    const publishedRequired = legalDocs.filter((d) => d.version);
    // Always require checkboxes shown on Review (Privacy / Terms / Guidelines).
    for (const doc of legalDocs) {
      if (!acceptedLegal[doc.documentKey]) {
        setMsg(`Please accept the ${doc.title}.`);
        return;
      }
    }

    setLoading(true);
    try {
      const legalAcceptances: LegalAcceptance[] = [];
      for (const doc of publishedRequired) {
        legalAcceptances.push({ documentKey: doc.documentKey, version: doc.version });
      }

      const payload: RegisterPayload = {
        fullName: fullName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        gender: gender.trim() || null,
        dob: dob ? formatDate(dob) : null,
        mobile: mobile.trim(),
        occupation: occupation.trim() || null,
        location: location.trim(),
        kulam: kulam.trim(),
        ...(referralCode.trim() ? { referralCode: referralCode.trim().toUpperCase() } : {}),
        ...(legalAcceptances.length ? { legalAcceptances } : {})
      };
      const registered = await registerApi(payload);
      let sessionUser = registered.user;

      if (photoLocalUri) {
        setUploadingPhoto(true);
        await setToken(registered.accessToken);
        try {
          const uploaded = await uploadOptimizedImage(photoLocalUri, "profile");
          sessionUser = await setRegistrationPhoto(uploaded.publicUrl);
        } catch (photoErr) {
          // Account is created — don't fail registration if optional photo upload fails.
          console.warn("[register] optional photo upload failed", photoErr);
          setMsg(
            "Account created. Profile photo could not be uploaded — you can add it later after approval."
          );
        } finally {
          setUploadingPhoto(false);
        }
      }

      await signIn(registered.accessToken, sessionUser);
      // Auth gate routes PENDING → PendingApproval
    } catch (e: any) {
      setMsg(getAuthErrorMessage(e));
    } finally {
      setLoading(false);
      setUploadingPhoto(false);
    }
  };

  return (
    <View style={s.background}>
      <LinearGradient colors={LANDING_GRADIENT} style={StyleSheet.absoluteFill} />
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
                <Text style={s.photoLabel}>Profile photo (optional)</Text>
                <View style={s.photoRow}>
                  <View style={s.photoCircle}>
                    {photoLocalUri ? (
                      <Image source={{ uri: photoLocalUri }} style={s.photoImage} />
                    ) : (
                      <Ionicons name="person-outline" size={36} color={ICON_COLOR} />
                    )}
                  </View>
                  <View style={s.photoActions}>
                    <Pressable
                      style={({ pressed }) => [s.photoBtn, pressed && { opacity: 0.85 }]}
                      onPress={pickPhoto}
                    >
                      <Text style={s.photoBtnText}>
                        {photoLocalUri ? "Change photo" : "Upload photo"}
                      </Text>
                    </Pressable>
                    {photoLocalUri ? (
                      <Pressable
                        style={({ pressed }) => [s.photoRemove, pressed && { opacity: 0.85 }]}
                        onPress={() => setPhotoLocalUri(null)}
                      >
                        <Text style={s.photoRemoveText}>Remove</Text>
                      </Pressable>
                    ) : (
                      <Text style={s.photoHint}>You can skip this and add a photo later.</Text>
                    )}
                  </View>
                </View>
                <Input
                  placeholder="Full name *"
                  value={fullName}
                  onChangeText={setFullName}
                  variant="onWhite"
                  leftIcon={<Ionicons name="person-outline" size={ICON_SIZE} color={ICON_COLOR} />}
                />
                <Input
                  placeholder="@username *"
                  value={username}
                  onChangeText={setUsername}
                  variant="onWhite"
                  autoCapitalize="none"
                  autoCorrect={false}
                  leftIcon={<Ionicons name="at-outline" size={ICON_SIZE} color={ICON_COLOR} />}
                />
                <Dropdown
                  placeholder="Select gender"
                  value={gender}
                  options={GENDER_OPTIONS}
                  onSelect={setGender}
                  variant="light"
                />
                <Pressable style={s.dateRow} onPress={() => setShowDobPicker(true)}>
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
                  variant="onWhite"
                  leftIcon={<Ionicons name="mail-outline" size={ICON_SIZE} color={ICON_COLOR} />}
                />
                <Input
                  placeholder="Mobile number * (min 10 digits)"
                  value={mobile}
                  onChangeText={setMobile}
                  keyboardType="phone-pad"
                  variant="onWhite"
                  leftIcon={<Ionicons name="call-outline" size={ICON_SIZE} color={ICON_COLOR} />}
                />
              </>
            )}
            {step === 2 && (
              <>
                {occupationOptions.length > 0 ? (
                  <Dropdown
                    placeholder="Occupation (optional)"
                    value={occupation}
                    options={occupationOptions}
                    onSelect={setOccupation}
                    variant="light"
                  />
                ) : (
                  <Input
                    placeholder="Occupation (optional)"
                    value={occupation}
                    onChangeText={setOccupation}
                    variant="onWhite"
                  />
                )}
                <Dropdown
                  placeholder="Select district *"
                  value={location}
                  options={locationOptions}
                  onSelect={setLocation}
                  variant="light"
                  required
                />
                <Dropdown
                  placeholder="Select kulam *"
                  value={kulam}
                  options={kulamOptions}
                  onSelect={setKulam}
                  variant="light"
                  required
                  label="Kulam"
                />
                <Input
                  placeholder="Referral Code (Optional)"
                  value={referralCode}
                  onChangeText={setReferralCode}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  variant="onWhite"
                />
              </>
            )}
            {step === 3 && (
              <>
                <Text style={s.reviewLabel}>Profile photo</Text>
                <Text style={s.reviewValue}>{photoLocalUri ? "Selected" : "Not added (optional)"}</Text>
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
                <Text style={s.reviewLabel}>Referral Code (Optional)</Text>
                <Text style={s.reviewValue}>{referralCode.trim() || "Not provided"}</Text>

                <Text style={[s.reviewLabel, { marginTop: spacing.md }]}>Legal agreements</Text>
                <Text style={[s.reviewHint, { marginTop: spacing.sm }]}>
                  {legalDocs.some((d) => d.version)
                    ? "You must review and accept the latest Privacy Policy, Terms & Conditions, and Community Guidelines."
                    : "Please review and accept the Privacy Policy, Terms & Conditions, and Community Guidelines. Tap a title to read the latest published version."}
                </Text>
                {legalDocs.map((doc) => {
                  const checked = !!acceptedLegal[doc.documentKey];
                  return (
                    <View key={doc.documentKey} style={s.legalRow}>
                      <Pressable
                        onPress={() =>
                          setAcceptedLegal((prev) => ({
                            ...prev,
                            [doc.documentKey]: !prev[doc.documentKey]
                          }))
                        }
                        hitSlop={8}
                        style={s.legalCheck}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked }}
                      >
                        <Ionicons
                          name={checked ? "checkbox" : "square-outline"}
                          size={22}
                          color={checked ? "#2563EB" : "#6B7280"}
                        />
                      </Pressable>
                      <Text style={s.legalText}>
                        I accept the{" "}
                        <Text
                          style={s.legalLink}
                          onPress={() =>
                            navigation.navigate("LegalDocument", {
                              documentKey: doc.documentKey,
                              slug: doc.slug,
                              title: doc.title
                            })
                          }
                        >
                          {doc.title}
                        </Text>
                        {doc.version ? ` (v${doc.version})` : ""}
                      </Text>
                    </View>
                  );
                })}

                <Text style={s.reviewHint}>
                  Your account will be reviewed by an admin (1–2 days). No password needed—login with OTP
                  after approval.
                </Text>
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
                style={({ pressed }) => [
                  s.btnWrap,
                  pressed && s.btnPressed,
                  (loading || uploadingPhoto) && s.btnDisabled
                ]}
                onPress={onSubmit}
                disabled={loading || uploadingPhoto}
              >
                <LinearGradient
                  colors={["#2563EB", "#F97316"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.btn}
                >
                  {loading || uploadingPhoto ? (
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
      </AppKeyboardAvoidingView>
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
  photoLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 10 },
  photoRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.lg, gap: 14 },
  photoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  photoImage: { width: 72, height: 72 },
  photoActions: { flex: 1 },
  photoBtn: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE"
  },
  photoBtnText: { fontSize: 14, fontWeight: "600", color: "#2563EB" },
  photoRemove: { marginTop: 8, alignSelf: "flex-start", paddingVertical: 4 },
  photoRemoveText: { fontSize: 13, color: "#EF4444", fontWeight: "500" },
  photoHint: { marginTop: 8, fontSize: 12, color: "#9CA3AF", lineHeight: 16 },
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
  legalRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: spacing.sm
  },
  legalCheck: { paddingTop: 2 },
  legalText: { flex: 1, fontSize: 14, color: "#111827", lineHeight: 20 },
  legalLink: { color: "#2563EB", fontWeight: "700", textDecorationLine: "underline" },
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
