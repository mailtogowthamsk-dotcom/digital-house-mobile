import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Keyboard
} from "react-native";
import { AppKeyboardAvoidingView } from "../../components/ui/AppKeyboardAvoidingView";
import { DobDatePicker } from "../../components/ui/DobDatePicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { Input } from "../../components/ui/Input";
import { Dropdown } from "../../components/ui/Dropdown";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { completeGoogleProfile } from "../../api/auth.api";
import { getLocations, getKulams, getMasterItems, masterItemsToDropdown } from "../../api/options.api";
import { getAuthErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { spacing } from "../../theme/spacing";
import { GENDER_OPTIONS, LOCATION_OPTIONS, KULAM_OPTIONS } from "./registrationOptions";
import { isValidUsername, normalizeMobile } from "../../utils/registrationFields";
import {
  LEGAL_FALLBACK_LINKS,
  LEGAL_REGISTRATION_KEYS,
  listLegalCatalog,
  type LegalAcceptance,
  type LegalCatalogItem
} from "../../api/legal.api";

const LOGO = require("../../../assets/logo_digital_house.png");
const GRADIENT = ["#0B1220", "#1a2744", "#0d1829"] as const;

function formatDate(d: Date | null): string {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function GoogleCompleteProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user, refreshSession } = useAuth();
  const submittingRef = useRef(false);

  const [username, setUsername] = useState("");
  const [mobile, setMobile] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState<Date | null>(null);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [district, setDistrict] = useState("");
  const [kulam, setKulam] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [occupation, setOccupation] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [address, setAddress] = useState("");
  const [workStudyDetails, setWorkStudyDetails] = useState("");
  const [locationOptions, setLocationOptions] = useState(LOCATION_OPTIONS);
  const [kulamOptions, setKulamOptions] = useState(KULAM_OPTIONS);
  const [occupationOptions, setOccupationOptions] = useState<{ label: string; value: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [legalDocs, setLegalDocs] = useState<LegalCatalogItem[]>([]);
  const [acceptedLegal, setAcceptedLegal] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void (async () => {
      try {
        const [locations, kulams, occupations] = await Promise.all([
          getLocations(),
          getKulams(),
          getMasterItems("OCCUPATION").catch(() => [])
        ]);
        if (locations.length > 0) {
          setLocationOptions(locations.map((l) => ({ label: l.name, value: l.name })));
        }
        if (kulams.length > 0) {
          setKulamOptions(kulams.map((k) => ({ label: k.displayName || k.name, value: k.name })));
        }
        if (occupations.length > 0) {
          setOccupationOptions(masterItemsToDropdown(occupations));
        }
      } catch {
        /* fallback options */
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const catalog = await listLegalCatalog();
        if (cancelled) return;
        const required = catalog.filter((d) =>
          (LEGAL_REGISTRATION_KEYS as readonly string[]).includes(d.documentKey)
        );
        setLegalDocs(
          required.length
            ? required
            : LEGAL_FALLBACK_LINKS.filter((d) =>
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

  const normalizedMobile = useMemo(() => normalizeMobile(mobile), [mobile]);
  const usernameOk = isValidUsername(username);
  const legalOk = legalDocs.length > 0 && legalDocs.every((doc) => acceptedLegal[doc.documentKey]);

  const canSubmit =
    usernameOk &&
    !!normalizedMobile &&
    !!gender &&
    !!dob &&
    !!district &&
    !!kulam &&
    legalOk &&
    !loading;

  const validate = (): string | null => {
    if (!usernameOk) {
      return "Username must be 3–30 characters, start with a letter, and use only lowercase letters, numbers, or underscores.";
    }
    if (!normalizedMobile) {
      return "Please enter a valid 10-digit Indian mobile number.";
    }
    if (!gender) return "Please select gender.";
    if (!dob) return "Please select date of birth.";
    if (!district) return "Please select district.";
    if (!kulam) return "Please select your Kulam.";
    for (const doc of legalDocs) {
      if (!acceptedLegal[doc.documentKey]) {
        return `Please accept the ${doc.title}.`;
      }
    }
    return null;
  };

  const onSubmit = async () => {
    Keyboard.dismiss();
    setMsg(null);
    if (submittingRef.current || loading) return;

    const error = validate();
    if (error) {
      setMsg(error);
      return;
    }
    if (!dob || !normalizedMobile) return;

    submittingRef.current = true;
    setLoading(true);
    try {
      const publishedRequired = legalDocs.filter((d) => d.version);
      const legalAcceptances: LegalAcceptance[] = publishedRequired.map((doc) => ({
        documentKey: doc.documentKey,
        version: doc.version
      }));
      await completeGoogleProfile({
        username: username.trim().toLowerCase(),
        gender,
        dob: formatDate(dob),
        district,
        kulam,
        location: district,
        mobile: normalizedMobile,
        occupation: occupation.trim() || null,
        fatherName: fatherName.trim() || null,
        address: address.trim() || null,
        workStudyDetails: workStudyDetails.trim() || null,
        ...(referralCode.trim() ? { referralCode: referralCode.trim().toUpperCase() } : {}),
        ...(legalAcceptances.length ? { legalAcceptances } : {})
      });
      await refreshSession();
    } catch (e) {
      setMsg(getAuthErrorMessage(e));
      submittingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.fill}>
      <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} />
      <AppKeyboardAvoidingView style={styles.fill}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + spacing.md,
            paddingBottom: insets.bottom + spacing.xxxl,
            paddingHorizontal: spacing.xl
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Image source={LOGO} style={styles.logo} resizeMode="contain" />
            <Text style={styles.title}>Complete your profile</Text>
            <Text style={styles.subtitle}>
              Welcome{user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}! Fill all required
              fields to submit your registration for admin approval.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Required details</Text>

            <Input
              placeholder="@username *"
              value={username}
              onChangeText={(t) => setUsername(t.replace(/\s/g, "").toLowerCase())}
              autoCapitalize="none"
              autoCorrect={false}
              variant="onWhite"
            />
            <Input
              placeholder="Mobile number * (10 digits)"
              value={mobile}
              onChangeText={(t) => setMobile(t.replace(/[^\d+\s-]/g, "").slice(0, 16))}
              keyboardType="phone-pad"
              variant="onWhite"
            />
            <Dropdown
              label="Gender"
              value={gender}
              options={GENDER_OPTIONS}
              onSelect={setGender}
              placeholder="Select gender *"
              required
            />
            <Pressable onPress={() => setShowDobPicker((v) => !v)} style={styles.dobBtn}>
              <Text style={styles.dobLabel}>Date of birth *</Text>
              <Text style={styles.dobValue}>{dob ? formatDate(dob) : "Select date"}</Text>
            </Pressable>
            <DobDatePicker
              visible={showDobPicker}
              value={dob ?? new Date(2000, 0, 1)}
              onChange={setDob}
              onClose={() => setShowDobPicker(false)}
              maximumDate={new Date()}
            />
            <Dropdown
              label="District"
              value={district}
              options={locationOptions}
              onSelect={setDistrict}
              placeholder="Select district *"
              required
            />
            <Dropdown
              label="Kulam"
              value={kulam}
              options={kulamOptions}
              onSelect={setKulam}
              placeholder="Select kulam *"
              required
            />

            <Text style={[styles.sectionLabel, { marginTop: spacing.sm }]}>Optional</Text>
            <Input
              placeholder="Father's name (optional)"
              value={fatherName}
              onChangeText={setFatherName}
              variant="onWhite"
            />
            <Input
              placeholder="Address (optional)"
              value={address}
              onChangeText={setAddress}
              variant="onWhite"
              multiline
              numberOfLines={3}
              style={{ minHeight: 88 }}
            />
            {occupationOptions.length > 0 ? (
              <Dropdown
                label="Occupation"
                value={occupation}
                options={occupationOptions}
                onSelect={setOccupation}
                placeholder="Occupation (optional)"
              />
            ) : (
              <Input
                placeholder="Occupation (optional)"
                value={occupation}
                onChangeText={setOccupation}
                variant="onWhite"
              />
            )}
            <Input
              placeholder="Work / study details (optional)"
              value={workStudyDetails}
              onChangeText={setWorkStudyDetails}
              variant="onWhite"
              multiline
              numberOfLines={4}
              style={{ minHeight: 100 }}
            />
            <Input
              placeholder="Referral Code (Optional)"
              value={referralCode}
              onChangeText={setReferralCode}
              autoCapitalize="characters"
              autoCorrect={false}
              variant="onWhite"
            />

            <Text style={styles.legalHeading}>Legal agreements *</Text>
            <Text style={styles.legalHint}>
              Accept Privacy Policy, Terms & Conditions, and Community Guidelines to continue.
            </Text>
            {legalDocs.map((doc) => {
              const checked = !!acceptedLegal[doc.documentKey];
              return (
                <View key={doc.documentKey} style={styles.legalRow}>
                  <Pressable
                    onPress={() =>
                      setAcceptedLegal((prev) => ({
                        ...prev,
                        [doc.documentKey]: !prev[doc.documentKey]
                      }))
                    }
                    hitSlop={8}
                  >
                    <Ionicons
                      name={checked ? "checkbox" : "square-outline"}
                      size={22}
                      color={checked ? "#2563EB" : "#6B7280"}
                    />
                  </Pressable>
                  <Text style={styles.legalText}>
                    I accept the{" "}
                    <Text
                      style={styles.legalLink}
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

            {msg ? <Text style={styles.error}>{msg}</Text> : null}
            <PrimaryButton
              title="Submit registration"
              onPress={() => void onSubmit()}
              loading={loading}
              disabled={!canSubmit}
            />
            <Text style={styles.hint}>
              Username, mobile, gender, date of birth, district, and kulam are mandatory. After
              submit, admin approval is still required before full access.
            </Text>
          </View>
        </ScrollView>
      </AppKeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { alignItems: "center", marginBottom: spacing.lg },
  logo: { width: 112, height: 112, marginBottom: spacing.md },
  title: { color: "#fff", fontSize: 22, fontWeight: "800" },
  subtitle: { color: "rgba(255,255,255,0.8)", textAlign: "center", marginTop: 8, lineHeight: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: spacing.xl,
    gap: spacing.md
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: 0.4
  },
  dobBtn: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: spacing.md
  },
  dobLabel: { fontSize: 12, color: "#6B7280", marginBottom: 4 },
  dobValue: { fontSize: 16, color: "#111827", fontWeight: "600" },
  error: { color: "#EF4444", fontSize: 14 },
  legalHeading: { fontSize: 14, fontWeight: "800", color: "#111827", marginTop: spacing.sm },
  legalHint: { fontSize: 12, color: "#6B7280", lineHeight: 18 },
  legalRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  legalText: { flex: 1, fontSize: 14, color: "#111827", lineHeight: 20 },
  legalLink: { color: "#2563EB", fontWeight: "700", textDecorationLine: "underline" },
  hint: { fontSize: 12, color: "#6B7280", textAlign: "center", lineHeight: 18 }
});
