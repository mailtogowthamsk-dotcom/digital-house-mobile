import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  Image,
  Keyboard
} from "react-native";
import { AppKeyboardAvoidingView } from "../../components/ui/AppKeyboardAvoidingView";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { Input } from "../../components/ui/Input";
import { Dropdown } from "../../components/ui/Dropdown";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { completeGoogleProfile } from "../../api/auth.api";
import { getLocations, getKulams } from "../../api/options.api";
import { getAuthErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { spacing } from "../../theme/spacing";
import { GENDER_OPTIONS, LOCATION_OPTIONS, KULAM_OPTIONS } from "./registrationOptions";

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
  const [username, setUsername] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState<Date | null>(null);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [district, setDistrict] = useState("");
  const [kulam, setKulam] = useState("");
  const [community, setCommunity] = useState("");
  const [mobile, setMobile] = useState("");
  const [locationOptions, setLocationOptions] = useState(LOCATION_OPTIONS);
  const [kulamOptions, setKulamOptions] = useState(KULAM_OPTIONS);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [locations, kulams] = await Promise.all([getLocations(), getKulams()]);
        if (locations.length > 0) {
          setLocationOptions(locations.map((l) => ({ label: l.name, value: l.name })));
        }
        if (kulams.length > 0) {
          setKulamOptions(kulams.map((k) => ({ label: k.name, value: k.name })));
        }
      } catch {
        /* fallback options */
      }
    })();
  }, []);

  const onSubmit = async () => {
    Keyboard.dismiss();
    setMsg(null);
    if (!username.trim() || username.trim().length < 3) return setMsg("Please choose a username.");
    if (!gender) return setMsg("Please select gender.");
    if (!dob) return setMsg("Please select date of birth.");
    if (!district) return setMsg("Please select district.");
    if (!kulam) return setMsg("Please select your Kulam.");

    setLoading(true);
    try {
      await completeGoogleProfile({
        username: username.trim().toLowerCase(),
        gender,
        dob: formatDate(dob),
        district,
        kulam,
        community: community.trim() || null,
        location: district,
        mobile: mobile.trim() || null
      });
      await refreshSession();
      /* App remounts stack via initialRoute key after session refresh */
    } catch (e) {
      setMsg(getAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.fill}>
      <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} />
      <AppKeyboardAvoidingView
        style={styles.fill}
      >
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
              Welcome{user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}! A few community details
              are required before you continue.
            </Text>
          </View>

          <View style={styles.card}>
            <Input
              placeholder="@username *"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              variant="light"
            />
            <Dropdown
              label="Gender"
              value={gender}
              options={GENDER_OPTIONS}
              onSelect={setGender}
              placeholder="Select gender"
            />
            <Pressable onPress={() => setShowDobPicker(true)} style={styles.dobBtn}>
              <Text style={styles.dobLabel}>Date of birth</Text>
              <Text style={styles.dobValue}>{dob ? formatDate(dob) : "Select date"}</Text>
            </Pressable>
            {showDobPicker ? (
              <DateTimePicker
                value={dob ?? new Date(2000, 0, 1)}
                mode="date"
                maximumDate={new Date()}
                onChange={(_, date) => {
                  if (Platform.OS === "android") setShowDobPicker(false);
                  if (date) setDob(date);
                }}
              />
            ) : null}
            <Dropdown
              label="District"
              value={district}
              options={locationOptions}
              onSelect={setDistrict}
              placeholder="Select district"
            />
            <Dropdown
              label="Kulam"
              value={kulam}
              options={kulamOptions}
              onSelect={setKulam}
              placeholder="Select kulam"
              required
            />
            <Input
              placeholder="Community details (optional)"
              value={community}
              onChangeText={setCommunity}
              variant="light"
            />
            <Input
              placeholder="Mobile (optional)"
              value={mobile}
              onChangeText={setMobile}
              keyboardType="phone-pad"
              variant="light"
            />
            {msg ? <Text style={styles.error}>{msg}</Text> : null}
            <PrimaryButton title="Continue" onPress={() => void onSubmit()} loading={loading} />
            <Text style={styles.hint}>
              Your account will still require admin approval before full access, same as email registration.
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
  logo: { width: 120, height: 48, marginBottom: spacing.md },
  title: { color: "#fff", fontSize: 22, fontWeight: "800" },
  subtitle: { color: "rgba(255,255,255,0.8)", textAlign: "center", marginTop: 8, lineHeight: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: spacing.xl,
    gap: spacing.md
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
  hint: { fontSize: 12, color: "#6B7280", textAlign: "center", lineHeight: 18 }
});
