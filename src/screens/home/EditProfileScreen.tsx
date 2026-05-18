import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Image
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { getProfile, putProfileSection, updateProfile } from "../../api/profile.api";
import { getMatrimonyHub, type MatrimonyHub } from "../../api/matrimony.api";
import type { ProfileMeResponse, ProfileSectionName } from "../../api/profile.api";
import { getErrorStatus, getImageUrl } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { uploadOptimizedImage, isAllowedImageType } from "../../utils/mediaUpload";
import { MatrimonyEditProfileCard } from "../../components/matrimony/MatrimonyEditProfileCard";
import { useTheme } from "../../theme/ThemeContext";
import { typography } from "../../theme/typography";
import { spacing, radius } from "../../theme/spacing";
import { Input } from "../../components/ui/Input";
import { Dropdown } from "../../components/ui/Dropdown";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { AccordionSection } from "../../components/profile/AccordionSection";
import type {
  BasicSectionForm,
  CommunitySectionForm,
  PersonalSectionForm,
  MatrimonySectionForm,
  BusinessSectionForm,
  FamilySectionForm
} from "../../types/profile.types";
import {
  GENDER_OPTIONS,
  ROLE_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  BUSINESS_TYPE_OPTIONS
} from "../../types/profile.types";

const emptyBasic = (): BasicSectionForm => ({
  full_name: "",
  date_of_birth: null,
  email: "",
  mobile: null,
  gender: null,
  native_district: null,
  role: null
});

const emptyCommunity = (): CommunitySectionForm => ({
  kulam: null,
  kulaDeivam: null,
  nativeVillage: null,
  nativeTaluk: null
});

const emptyPersonal = (): PersonalSectionForm => ({
  currentLocation: null,
  occupation: null,
  instagram: null,
  facebook: null,
  linkedin: null,
  hobbies: null,
  fatherName: null,
  maritalStatus: null
});

const emptyMatrimony = (): MatrimonySectionForm => ({
  matrimonyProfileActive: false,
  lookingFor: null,
  education: null,
  maritalStatus: null,
  rashi: null,
  nakshatram: null,
  dosham: null,
  familyType: null,
  familyStatus: null,
  motherName: null,
  fatherOccupation: null,
  numberOfSiblings: null,
  partnerPreferences: null,
  horoscopeDocumentUrl: null
});

const emptyBusiness = (): BusinessSectionForm => ({
  businessProfileActive: false,
  businessName: null,
  businessType: null,
  businessDescription: null,
  businessAddress: null,
  businessPhone: null,
  businessWebsite: null
});

const emptyFamily = (): FamilySectionForm => ({
  familyMemberId1: null,
  familyMemberId2: null,
  familyMemberId3: null,
  familyMemberId4: null,
  familyMemberId5: null
});

function mapProfileToForm(profile: ProfileMeResponse) {
  const sections = profile.sections;
  const basic: BasicSectionForm = sections?.basic
    ? {
        full_name: sections.basic.full_name ?? "",
        date_of_birth: sections.basic.date_of_birth ?? null,
        email: sections.basic.email ?? "",
        mobile: sections.basic.mobile ?? null,
        gender: sections.basic.gender ?? null,
        native_district: sections.basic.native_district ?? null,
        role: sections.basic.role ?? null
      }
    : {
        ...emptyBasic(),
        full_name: profile.name ?? "",
        email: profile.personal_info?.masked_email ?? "",
        mobile: profile.personal_info?.masked_mobile ?? null,
        date_of_birth: profile.personal_info?.dob ?? null
      };

  const community: CommunitySectionForm = sections?.community
    ? {
        kulam: (sections.community as any).kulam ?? null,
        kulaDeivam: (sections.community as any).kulaDeivam ?? null,
        nativeVillage: (sections.community as any).nativeVillage ?? null,
        nativeTaluk: (sections.community as any).nativeTaluk ?? null
      }
    : emptyCommunity();

  const personal: PersonalSectionForm = sections?.personal
    ? {
        currentLocation: (sections.personal as any).currentLocation ?? null,
        occupation: (sections.personal as any).occupation ?? null,
        instagram: (sections.personal as any).instagram ?? null,
        facebook: (sections.personal as any).facebook ?? null,
        linkedin: (sections.personal as any).linkedin ?? null,
        hobbies: (sections.personal as any).hobbies ?? null,
        fatherName: (sections.personal as any).fatherName ?? null,
        maritalStatus: (sections.personal as any).maritalStatus ?? null
      }
    : emptyPersonal();

  const matrimony: MatrimonySectionForm = sections?.matrimony
    ? {
        matrimonyProfileActive: (sections.matrimony as any).matrimonyProfileActive === true,
        lookingFor: (sections.matrimony as any).lookingFor ?? null,
        education: (sections.matrimony as any).education ?? null,
        maritalStatus: (sections.matrimony as any).maritalStatus ?? null,
        rashi: (sections.matrimony as any).rashi ?? null,
        nakshatram: (sections.matrimony as any).nakshatram ?? null,
        dosham: (sections.matrimony as any).dosham ?? null,
        familyType: (sections.matrimony as any).familyType ?? null,
        familyStatus: (sections.matrimony as any).familyStatus ?? null,
        motherName: (sections.matrimony as any).motherName ?? null,
        fatherOccupation: (sections.matrimony as any).fatherOccupation ?? null,
        numberOfSiblings: (sections.matrimony as any).numberOfSiblings ?? null,
        partnerPreferences: (sections.matrimony as any).partnerPreferences ?? null,
        horoscopeDocumentUrl: (sections.matrimony as any).horoscopeDocumentUrl ?? null
      }
    : emptyMatrimony();

  const business: BusinessSectionForm = sections?.business
    ? {
        businessProfileActive: (sections.business as any).businessProfileActive === true,
        businessName: (sections.business as any).businessName ?? null,
        businessType: (sections.business as any).businessType ?? null,
        businessDescription: (sections.business as any).businessDescription ?? null,
        businessAddress: (sections.business as any).businessAddress ?? null,
        businessPhone: (sections.business as any).businessPhone ?? null,
        businessWebsite: (sections.business as any).businessWebsite ?? null
      }
    : emptyBusiness();

  const family: FamilySectionForm = sections?.family
    ? {
        familyMemberId1: (sections.family as any).familyMemberId1 ?? null,
        familyMemberId2: (sections.family as any).familyMemberId2 ?? null,
        familyMemberId3: (sections.family as any).familyMemberId3 ?? null,
        familyMemberId4: (sections.family as any).familyMemberId4 ?? null,
        familyMemberId5: (sections.family as any).familyMemberId5 ?? null
      }
    : emptyFamily();

  return { basic, community, personal, matrimony, business, family };
}

export function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { signOut } = useAuth();
  const { colors } = useTheme();
  const [profile, setProfile] = useState<ProfileMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [profilePhotoUploading, setProfilePhotoUploading] = useState(false);
  const [matrimonyHub, setMatrimonyHub] = useState<MatrimonyHub | null>(null);
  const [matrimonyHubLoading, setMatrimonyHubLoading] = useState(true);

  const [basic, setBasic] = useState<BasicSectionForm>(emptyBasic());
  const [community, setCommunity] = useState<CommunitySectionForm>(emptyCommunity());
  const [personal, setPersonal] = useState<PersonalSectionForm>(emptyPersonal());
  const [business, setBusiness] = useState<BusinessSectionForm>(emptyBusiness());
  const [family, setFamily] = useState<FamilySectionForm>(emptyFamily());

  const initialFormRef = React.useRef<ReturnType<typeof mapProfileToForm> | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setMatrimonyHubLoading(true);
    setError(null);
    try {
      const [data, hub] = await Promise.all([
        getProfile(),
        getMatrimonyHub().catch(() => null)
      ]);
      setProfile(data);
      setMatrimonyHub(hub);
      const form = mapProfileToForm(data);
      initialFormRef.current = form;
      setBasic(form.basic);
      setCommunity(form.community);
      setPersonal(form.personal);
      setBusiness(form.business);
      setFamily(form.family);
    } catch (e) {
      const status = getErrorStatus(e);
      if (status === 401) {
        await signOut();
        navigation.reset({ index: 0, routes: [{ name: "Landing" }] });
        return;
      }
      if (status === 403) {
        navigation.reset({ index: 0, routes: [{ name: "PendingApproval" }] });
        return;
      }
      setError((e as any)?.response?.data?.message ?? "Failed to load profile");
    } finally {
      setLoading(false);
      setMatrimonyHubLoading(false);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const isBasicDirty = useMemo(() => {
    const init = initialFormRef.current?.basic;
    if (!init) return false;
    return (
      basic.full_name !== init.full_name ||
      basic.date_of_birth !== init.date_of_birth ||
      basic.gender !== init.gender ||
      basic.native_district !== init.native_district
    );
  }, [basic, initialFormRef.current]);

  const isSectionDirty = useCallback(
    (
      section: "community" | "personal" | "business" | "family",
      current: Record<string, unknown>
    ) => {
      const init = initialFormRef.current?.[section] as Record<string, unknown> | undefined;
      if (!init) return true;
      return JSON.stringify(current) !== JSON.stringify(init);
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!profile) return;
    setSaving(true);
    setError(null);
    try {
      const sectionsToUpdate: { section: ProfileSectionName; payload: Record<string, unknown> }[] = [];

      if (isBasicDirty) {
        sectionsToUpdate.push({
          section: "basic",
          payload: {
            full_name: basic.full_name.trim() || undefined,
            date_of_birth: basic.date_of_birth || null,
            gender: basic.gender || null,
            native_district: basic.native_district || null
          }
        });
      }

      if (isSectionDirty("community", community)) {
        sectionsToUpdate.push({
          section: "community",
          payload: {
            kulam: community.kulam ?? null,
            kulaDeivam: community.kulaDeivam ?? null,
            nativeVillage: community.nativeVillage ?? null,
            nativeTaluk: community.nativeTaluk ?? null
          }
        });
      }
      if (isSectionDirty("personal", personal)) {
        sectionsToUpdate.push({
          section: "personal",
          payload: {
            currentLocation: personal.currentLocation?.trim() || null,
            occupation: personal.occupation?.trim() || null,
            instagram: personal.instagram?.trim() || null,
            facebook: personal.facebook?.trim() || null,
            linkedin: personal.linkedin?.trim() || null,
            hobbies: personal.hobbies?.trim() || null,
            fatherName: personal.fatherName?.trim() || null,
            maritalStatus: personal.maritalStatus?.trim() || null
          }
        });
      }
      if (isSectionDirty("business", business)) {
        sectionsToUpdate.push({
          section: "business",
          payload: {
            businessProfileActive: business.businessProfileActive,
            businessName: business.businessName?.trim() || null,
            businessType: business.businessType?.trim() || null,
            businessDescription: business.businessDescription?.trim() || null,
            businessAddress: business.businessAddress?.trim() || null,
            businessPhone: business.businessPhone?.trim() || null,
            businessWebsite: business.businessWebsite?.trim() || null
          }
        });
      }
      if (isSectionDirty("family", family)) {
        sectionsToUpdate.push({
          section: "family",
          payload: {
            familyMemberId1: family.familyMemberId1 ?? null,
            familyMemberId2: family.familyMemberId2 ?? null,
            familyMemberId3: family.familyMemberId3 ?? null,
            familyMemberId4: family.familyMemberId4 ?? null,
            familyMemberId5: family.familyMemberId5 ?? null
          }
        });
      }

      if (sectionsToUpdate.length === 0) {
        Alert.alert("No changes", "You haven't made any changes to save.", [{ text: "OK" }]);
        setSaving(false);
        return;
      }

      for (const { section, payload } of sectionsToUpdate) {
        const updated = await putProfileSection(section, payload);
        setProfile(updated);
        initialFormRef.current = mapProfileToForm(updated);
      }

      const includedBusiness = sectionsToUpdate.some((u) => u.section === "business");
      navigation.goBack();
      if (includedBusiness) {
        Alert.alert(
          "Submitted for Review",
          "Your business details have been submitted for admin review.",
          [{ text: "OK" }]
        );
      } else if (!profile.verified) {
        Alert.alert(
          "Profile Updated",
          "Your profile has been updated.",
          [{ text: "OK" }]
        );
      }
    } catch (e) {
      const status = getErrorStatus(e);
      if (status === 401) {
        await signOut();
        navigation.reset({ index: 0, routes: [{ name: "Landing" }] });
        return;
      }
      if (status === 403) {
        navigation.reset({ index: 0, routes: [{ name: "PendingApproval" }] });
        return;
      }
      setError((e as any)?.response?.data?.message ?? "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }, [
    profile,
    basic,
    community,
    personal,
    business,
    family,
    isBasicDirty,
    isSectionDirty,
    navigation
  ]);

  const openMatrimony = useCallback(() => {
    navigation.navigate("MatrimonyHome");
  }, [navigation]);

  const handleProfilePhotoUpload = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow access to photos to set your profile photo.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const uri = asset.uri;
      const mime = asset.mimeType ?? "image/jpeg";
      if (!isAllowedImageType(mime)) {
        Alert.alert("Invalid format", "Profile photo must be JPEG, PNG, or WebP.");
        return;
      }
      setProfilePhotoUploading(true);
      const { publicUrl } = await uploadOptimizedImage(uri, "profile");
      const updated = await updateProfile({ profile_image: publicUrl });
      setProfile(updated);
      if (initialFormRef.current) {
        initialFormRef.current = mapProfileToForm(updated);
      }
    } catch (e) {
      Alert.alert("Upload failed", (e as Error).message ?? "Could not upload profile photo.");
    } finally {
      setProfilePhotoUploading(false);
    }
  }, []);

  const dobDate = basic.date_of_birth ? new Date(basic.date_of_birth) : new Date();
  const onDobChange = (_: any, date?: Date) => {
    setShowDobPicker(Platform.OS === "ios");
    if (date) setBasic((b) => ({ ...b, date_of_birth: date.toISOString().split("T")[0] }));
  };

  const s = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        scroll: { flex: 1 },
        scrollContent: { flexGrow: 1, paddingHorizontal: spacing.xl },
        centered: { justifyContent: "center", alignItems: "center" },
        loadingText: {
          ...typography.bodySmall,
          color: colors.textSecondary,
          marginTop: spacing.md
        },
        errorText: {
          ...typography.bodySmall,
          color: colors.error,
          marginBottom: spacing.md,
          textAlign: "center"
        },
        errorInline: {
          ...typography.bodySmall,
          color: colors.error,
          marginBottom: spacing.lg
        },
        retryBtn: {
          marginTop: spacing.lg,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xxl,
          backgroundColor: colors.primary,
          borderRadius: radius.md
        },
        retryBtnText: { ...typography.buttonSmall, color: colors.white },
        profilePhotoRow: {
          flexDirection: "row",
          alignItems: "center",
          marginBottom: spacing.xl,
          gap: spacing.lg
        },
        profilePhotoWrap: {
          width: 88,
          height: 88,
          borderRadius: 44,
          backgroundColor: colors.surfaceElevated,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden"
        },
        profilePhotoImg: { width: 88, height: 88, borderRadius: 44 },
        profilePhotoPlaceholder: {
          width: 88,
          height: 88,
          borderRadius: 44,
          alignItems: "center",
          justifyContent: "center"
        },
        profilePhotoInitial: { ...typography.h3, color: colors.textMuted },
        profilePhotoBtn: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: spacing.sm,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md
        },
        profilePhotoBtnDisabled: { opacity: 0.7 },
        profilePhotoBtnText: { ...typography.bodySmall, color: colors.primary },
        completionRow: { marginBottom: spacing.xl },
        completionLabel: {
          ...typography.caption,
          color: colors.textMuted,
          marginBottom: spacing.xs
        },
        completionBar: {
          height: 6,
          backgroundColor: colors.border,
          borderRadius: 3,
          overflow: "hidden",
          marginBottom: spacing.xs
        },
        completionFill: {
          height: "100%",
          backgroundColor: colors.primary,
          borderRadius: 3
        },
        completionPct: { ...typography.caption, color: colors.textMuted },
        dateRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: colors.surfaceElevated,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.lg,
          minHeight: 52,
          paddingHorizontal: spacing.lg,
          marginBottom: spacing.lg
        },
        dateLabel: { ...typography.label, color: colors.textMuted, marginBottom: 0 },
        dateValue: { ...typography.body, color: colors.text },
        placeholder: { color: colors.textMuted },
        readOnlyRow: { marginBottom: spacing.lg },
        readOnlyLabel: {
          ...typography.label,
          color: colors.textMuted,
          marginBottom: 4
        },
        readOnlyValue: { ...typography.body, color: colors.text },
        switchRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: spacing.lg
        },
        switchLabel: { ...typography.label, color: colors.text },
        statusRow: { marginBottom: spacing.lg },
        statusChip: {
          alignSelf: "flex-start",
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.md,
          borderRadius: radius.md,
          marginBottom: spacing.sm
        },
        statusChipPending: { backgroundColor: "rgba(245, 158, 11, 0.2)" },
        statusChipApproved: { backgroundColor: "rgba(34, 197, 94, 0.2)" },
        statusChipRejected: { backgroundColor: "rgba(239, 68, 68, 0.2)" },
        statusChipText: { ...typography.caption, fontWeight: "600" },
        bannerText: {
          ...typography.bodySmall,
          color: colors.textSecondary,
          marginBottom: spacing.sm
        },
        remarksText: {
          ...typography.bodySmall,
          color: colors.error,
          marginBottom: spacing.md
        },
        restrictedSectionDisabled: { opacity: 0.7 },
        textArea: { minHeight: 88 },
        uploadRow: { marginBottom: spacing.lg },
        uploadLabel: {
          ...typography.label,
          color: colors.textMuted,
          marginBottom: spacing.sm
        },
        uploadBtn: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md
        },
        uploadBtnDisabled: { opacity: 0.7 },
        uploadBtnText: { ...typography.bodySmall, color: colors.primary },
        uploadHint: {
          ...typography.caption,
          color: colors.success,
          marginTop: spacing.xs
        },
        stickyBar: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.md
        },
        saveBtn: {}
      }),
    [colors]
  );

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

  const readOnlyEmailMobile = profile.verified;
  const pendingBusiness = profile.pending_business;
  const businessPending = pendingBusiness?.status === "PENDING";

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
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 88 }
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.profilePhotoRow}>
          <View style={s.profilePhotoWrap}>
            {getImageUrl(profile.profile_image) ? (
              <Image key={profile.profile_image} source={{ uri: getImageUrl(profile.profile_image)! }} style={s.profilePhotoImg} />
            ) : (
              <View style={s.profilePhotoPlaceholder}>
                <Text style={s.profilePhotoInitial}>
                  {(profile.name ?? "U").trim().charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <Pressable
            style={[s.profilePhotoBtn, profilePhotoUploading ? s.profilePhotoBtnDisabled : null]}
            onPress={handleProfilePhotoUpload}
            disabled={profilePhotoUploading}
          >
            {profilePhotoUploading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="camera-outline" size={20} color={colors.primary} />
            )}
            <Text style={s.profilePhotoBtnText}>
              {profile.profile_image ? "Change photo" : "Upload photo"}
            </Text>
          </Pressable>
        </View>

        {profile.completion_percentage != null ? (
          <View style={s.completionRow}>
            <Text style={s.completionLabel}>Profile completion</Text>
            <View style={s.completionBar}>
              <View style={[s.completionFill, { width: `${Math.min(100, profile.completion_percentage)}%` }]} />
            </View>
            <Text style={s.completionPct}>{String(profile.completion_percentage)}%</Text>
          </View>
        ) : null}

        <AccordionSection title="Basic Details" icon="person-outline" defaultExpanded>
          <Input
            label="Full Name"
            value={basic.full_name}
            onChangeText={(t) => setBasic((b) => ({ ...b, full_name: t }))}
            placeholder="Full name"
            variant="light"
          />
          <Pressable style={s.dateRow} onPress={() => setShowDobPicker(true)}>
            <Text style={s.dateLabel}>Date of Birth</Text>
            <Text style={[s.dateValue, !basic.date_of_birth ? s.placeholder : null]}>
              {basic.date_of_birth ?? "Select date"}
            </Text>
            <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
          </Pressable>
          {showDobPicker && (
            <DateTimePicker
              value={dobDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onDobChange}
              maximumDate={new Date()}
            />
          )}
          <Input
            label="Email"
            value={basic.email}
            editable={!readOnlyEmailMobile}
            placeholder="Email"
            variant="light"
          />
          <Input
            label="Mobile"
            value={basic.mobile ?? ""}
            onChangeText={(t) => setBasic((b) => ({ ...b, mobile: t || null }))}
            editable={!readOnlyEmailMobile}
            placeholder="Mobile"
            variant="light"
            keyboardType="phone-pad"
          />
          <Dropdown
            label="Gender"
            placeholder="Select gender"
            value={basic.gender ?? ""}
            options={GENDER_OPTIONS}
            onSelect={(v) => setBasic((b) => ({ ...b, gender: v || null }))}
            variant="light"
          />
          <Input
            label="Native District"
            value={basic.native_district ?? ""}
            onChangeText={(t) => setBasic((b) => ({ ...b, native_district: t || null }))}
            placeholder="Native district"
            variant="light"
          />
          <View style={s.readOnlyRow}>
            <Text style={s.readOnlyLabel}>Role in App</Text>
            <Text style={s.readOnlyValue}>{basic.role ?? "User"}</Text>
          </View>
        </AccordionSection>

        <AccordionSection title="Community Details" icon="people-outline">
          <Input
            label="Kulam"
            value={community.kulam ?? ""}
            onChangeText={(t) => setCommunity((c) => ({ ...c, kulam: t || null }))}
            placeholder="Kulam"
            variant="light"
          />
          <Input
            label="Kula Deivam"
            value={community.kulaDeivam ?? ""}
            onChangeText={(t) => setCommunity((c) => ({ ...c, kulaDeivam: t || null }))}
            placeholder="Kula Deivam"
            variant="light"
          />
          <Input
            label="Native Village"
            value={community.nativeVillage ?? ""}
            onChangeText={(t) => setCommunity((c) => ({ ...c, nativeVillage: t || null }))}
            placeholder="Native village"
            variant="light"
          />
          <Input
            label="Native Taluk"
            value={community.nativeTaluk ?? ""}
            onChangeText={(t) => setCommunity((c) => ({ ...c, nativeTaluk: t || null }))}
            placeholder="Native taluk"
            variant="light"
          />
        </AccordionSection>

        <AccordionSection title="Personal Details" icon="person-circle-outline">
          <Input
            label="Current Location (City, State)"
            value={personal.currentLocation ?? ""}
            onChangeText={(t) => setPersonal((p) => ({ ...p, currentLocation: t || null }))}
            placeholder="e.g. Chennai, Tamil Nadu"
            variant="light"
          />
          <Input
            label="Occupation"
            value={personal.occupation ?? ""}
            onChangeText={(t) => setPersonal((p) => ({ ...p, occupation: t || null }))}
            placeholder="Occupation"
            variant="light"
          />
          <Input
            label="Instagram URL"
            value={personal.instagram ?? ""}
            onChangeText={(t) => setPersonal((p) => ({ ...p, instagram: t || null }))}
            placeholder="https://instagram.com/..."
            variant="light"
            autoCapitalize="none"
          />
          <Input
            label="Facebook URL"
            value={personal.facebook ?? ""}
            onChangeText={(t) => setPersonal((p) => ({ ...p, facebook: t || null }))}
            placeholder="https://facebook.com/..."
            variant="light"
            autoCapitalize="none"
          />
          <Input
            label="LinkedIn URL"
            value={personal.linkedin ?? ""}
            onChangeText={(t) => setPersonal((p) => ({ ...p, linkedin: t || null }))}
            placeholder="https://linkedin.com/in/..."
            variant="light"
            autoCapitalize="none"
          />
          <Input
            label="Hobbies"
            value={personal.hobbies ?? ""}
            onChangeText={(t) => setPersonal((p) => ({ ...p, hobbies: t || null }))}
            placeholder="Comma-separated or tags"
            variant="light"
          />
          <Input
            label="Father Name"
            value={personal.fatherName ?? ""}
            onChangeText={(t) => setPersonal((p) => ({ ...p, fatherName: t || null }))}
            placeholder="Father's name"
            variant="light"
          />
          <Dropdown
            label="Marital Status"
            placeholder="Select"
            value={personal.maritalStatus ?? ""}
            options={MARITAL_STATUS_OPTIONS}
            onSelect={(v) => setPersonal((p) => ({ ...p, maritalStatus: v || null }))}
            variant="light"
          />
        </AccordionSection>

        <AccordionSection title="Matrimony" icon="heart-outline" defaultExpanded>
          <MatrimonyEditProfileCard
            hub={matrimonyHub}
            loading={matrimonyHubLoading}
            onOpen={openMatrimony}
          />
        </AccordionSection>

        <AccordionSection title="Business Details" icon="briefcase-outline">
          {pendingBusiness ? (
            <View style={s.statusRow}>
              <View style={[s.statusChip, pendingBusiness.status === "PENDING" && s.statusChipPending, pendingBusiness.status === "APPROVED" && s.statusChipApproved, pendingBusiness.status === "REJECTED" && s.statusChipRejected]}>
                <Text style={s.statusChipText}>
                  {pendingBusiness.status === "PENDING" ? "🟡 Pending Approval" : pendingBusiness.status === "APPROVED" ? "🟢 Approved" : "🔴 Rejected"}
                </Text>
              </View>
              {pendingBusiness.status === "PENDING" && (
                <Text style={s.bannerText}>Your Business details are under admin review.</Text>
              )}
              {pendingBusiness.status === "REJECTED" && pendingBusiness.admin_remarks ? (
                <Text style={s.remarksText}>Admin: {pendingBusiness.admin_remarks}</Text>
              ) : null}
            </View>
          ) : null}
          <View style={s.switchRow}>
            <Text style={s.switchLabel}>Business Profile Active</Text>
            <Switch
              value={business.businessProfileActive}
              onValueChange={(v) => setBusiness((b) => ({ ...b, businessProfileActive: v }))}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
              disabled={businessPending}
            />
          </View>
          {business.businessProfileActive ? (
            <View style={businessPending ? s.restrictedSectionDisabled : undefined} pointerEvents={businessPending ? "none" : "auto"}>
              <Input
                label="Business Name"
                value={business.businessName ?? ""}
                onChangeText={(t) => setBusiness((b) => ({ ...b, businessName: t || null }))}
                placeholder="Business name"
                variant="light"
              />
              <Dropdown
                label="Business Type"
                placeholder="Select type"
                value={business.businessType ?? ""}
                options={BUSINESS_TYPE_OPTIONS}
                onSelect={(v) => setBusiness((b) => ({ ...b, businessType: v || null }))}
                variant="light"
              />
              <Input
                label="Business Description"
                value={business.businessDescription ?? ""}
                onChangeText={(t) => setBusiness((b) => ({ ...b, businessDescription: t || null }))}
                placeholder="Description"
                variant="light"
                multiline
                numberOfLines={3}
                style={s.textArea}
              />
              <Input
                label="Business Address"
                value={business.businessAddress ?? ""}
                onChangeText={(t) => setBusiness((b) => ({ ...b, businessAddress: t || null }))}
                placeholder="Full address"
                variant="light"
                multiline
                style={s.textArea}
              />
              <Input
                label="Business Phone"
                value={business.businessPhone ?? ""}
                onChangeText={(t) => setBusiness((b) => ({ ...b, businessPhone: t || null }))}
                placeholder="Phone"
                variant="light"
                keyboardType="phone-pad"
              />
              <Input
                label="Business Website"
                value={business.businessWebsite ?? ""}
                onChangeText={(t) => setBusiness((b) => ({ ...b, businessWebsite: t || null }))}
                placeholder="https://..."
                variant="light"
                autoCapitalize="none"
              />
            </View>
          ) : null}
        </AccordionSection>

        <AccordionSection title="Family Details" icon="people-circle-outline">
          {([1, 2, 3, 4, 5] as const).map((i) => {
            const key = `familyMemberId${i}` as keyof FamilySectionForm;
            const val = family[key];
            return (
              <Input
                key={i}
                label={`Family Member ID ${i}`}
                value={val != null ? String(val) : ""}
                onChangeText={(t) => {
                  const n = t.trim() === "" ? null : parseInt(t, 10);
                  setFamily((f) => ({ ...f, [key]: n ?? null }));
                }}
                placeholder="User ID"
                variant="light"
                keyboardType="number-pad"
              />
            );
          })}
        </AccordionSection>

        {error ? <Text style={s.errorInline}>{error}</Text> : null}
      </ScrollView>

      <View style={[s.stickyBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <PrimaryButton
          title={saving ? "Saving…" : "Save Profile"}
          onPress={handleSave}
          disabled={saving}
          style={s.saveBtn}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
