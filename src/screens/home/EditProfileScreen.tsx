import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getProfile, updateProfile } from "../../api/profile.api";
import type { ProfileMeResponse, ProfileUpdatePayload } from "../../api/profile.api";
import { getErrorStatus } from "../../api/client";
import { clearToken } from "../../storage/token.storage";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing, radius } from "../../theme/spacing";
import { PrimaryButton } from "../../components/ui/PrimaryButton";

/**
 * Edit Profile Screen – editable fields only (profile_image, address, professional, skills).
 * On save: PUT /api/profile/me; if verified becomes false (PENDING_REVIEW), show approval-pending message.
 */
export function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [profile, setProfile] = useState<ProfileMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile_image, setProfileImage] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [education, setEducation] = useState("");
  const [job_title, setJobTitle] = useState("");
  const [company_name, setCompanyName] = useState("");
  const [work_location, setWorkLocation] = useState("");
  const [skills, setSkills] = useState("");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProfile();
      setProfile(data);
      setProfileImage(data.profile_image ?? "");
      setCity(data.personal_info.city ?? "");
      setDistrict(data.personal_info.district ?? "");
      setEducation(data.professional_info.education ?? "");
      setJobTitle(data.professional_info.job_title ?? "");
      setCompanyName(data.professional_info.company_name ?? "");
      setWorkLocation(data.professional_info.work_location ?? "");
      setSkills(data.professional_info.skills ?? "");
    } catch (e) {
      const status = getErrorStatus(e);
      if (status === 401) {
        await clearToken();
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }
      if (status === 403) {
        navigation.reset({ index: 0, routes: [{ name: "PendingApproval" }] });
        return;
      }
      setError((e as any)?.response?.data?.message ?? "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleSave = useCallback(async () => {
    if (!profile) return;
    setSaving(true);
    setError(null);
    try {
      const payload: ProfileUpdatePayload = {
        profile_image: profile_image.trim() || null,
        city: city.trim() || null,
        district: district.trim() || null,
        education: education.trim() || null,
        job_title: job_title.trim() || null,
        company_name: company_name.trim() || null,
        work_location: work_location.trim() || null,
        skills: skills.trim() || null
      };
      const updated = await updateProfile(payload);
      navigation.goBack();
      if (!updated.verified) {
        Alert.alert(
          "Profile Updated",
          "Your profile has been updated and will be reviewed by admin. You may need to wait for approval to continue using the app.",
          [{ text: "OK" }]
        );
      }
    } catch (e) {
      const status = getErrorStatus(e);
      if (status === 401) {
        await clearToken();
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }
      if (status === 403) {
        navigation.reset({ index: 0, routes: [{ name: "PendingApproval" }] });
        return;
      }
      setError((e as any)?.response?.data?.message ?? "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }, [
    profile,
    profile_image,
    city,
    district,
    education,
    job_title,
    company_name,
    work_location,
    skills,
    navigation
  ]);

  if (loading && !profile) {
    return (
      <View style={[s.container, s.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.loadingText}>Loading…</Text>
      </View>
    );
  }

  if (error && !profile) {
    return (
      <View style={[s.container, s.centered]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={s.errorText}>{error}</Text>
        <Pressable style={s.retryBtn} onPress={loadProfile}>
          <Text style={s.retryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!profile) return null;

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[
          s.scrollContent,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xxl }
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.hint}>Only the fields below can be edited. Changes require admin review.</Text>

        <View style={s.section}>
          <Text style={s.label}>Profile image URL</Text>
          <TextInput
            style={s.input}
            value={profile_image}
            onChangeText={setProfileImage}
            placeholder="https://..."
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Address</Text>
          <Text style={s.label}>City</Text>
          <TextInput
            style={s.input}
            value={city}
            onChangeText={setCity}
            placeholder="City"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={[s.label, s.labelTop]}>District</Text>
          <TextInput
            style={s.input}
            value={district}
            onChangeText={setDistrict}
            placeholder="District"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Professional</Text>
          <Text style={s.label}>Education</Text>
          <TextInput
            style={s.input}
            value={education}
            onChangeText={setEducation}
            placeholder="Education"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={[s.label, s.labelTop]}>Job title</Text>
          <TextInput
            style={s.input}
            value={job_title}
            onChangeText={setJobTitle}
            placeholder="Job title"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={[s.label, s.labelTop]}>Company / Business</Text>
          <TextInput
            style={s.input}
            value={company_name}
            onChangeText={setCompanyName}
            placeholder="Company name"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={[s.label, s.labelTop]}>Work location</Text>
          <TextInput
            style={s.input}
            value={work_location}
            onChangeText={setWorkLocation}
            placeholder="Work location"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={[s.label, s.labelTop]}>Skills / Category</Text>
          <TextInput
            style={s.input}
            value={skills}
            onChangeText={setSkills}
            placeholder="Skills or business category"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {error ? <Text style={s.errorText}>{error}</Text> : null}

        <PrimaryButton
          title={saving ? "Saving…" : "Save changes"}
          onPress={handleSave}
          disabled={saving}
          style={s.saveBtn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: spacing.xl },
  centered: { justifyContent: "center", alignItems: "center" },
  loadingText: { ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.md },
  hint: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xl
  },
  section: { marginBottom: spacing.xl },
  sectionTitle: {
    ...typography.label,
    color: colors.text,
    marginBottom: spacing.md
  },
  label: { ...typography.caption, color: colors.textMuted, marginBottom: 4 },
  labelTop: { marginTop: spacing.md },
  input: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  errorText: { ...typography.bodySmall, color: colors.error, marginBottom: spacing.md },
  retryBtn: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radius.md
  },
  retryBtnText: { ...typography.buttonSmall, color: colors.white },
  saveBtn: { marginTop: spacing.lg }
});
