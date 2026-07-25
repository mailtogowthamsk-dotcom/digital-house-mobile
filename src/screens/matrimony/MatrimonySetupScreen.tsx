import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator } from "react-native";
import { AppKeyboardAvoidingView } from "../../components/ui/AppKeyboardAvoidingView";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import {
  getMatrimonyHub,
  getMatrimonyFormOptions,
  saveMatrimonyDraft,
  submitMatrimonyProfile,
  type MatrimonyProfileData,
  type MatrimonyHub
} from "../../api/matrimony.api";
import { MATRIMONY_FIELD_LABELS, SECTION_LABELS } from "../../constants/matrimonyChanges";
import { getLocations, getKulams, type OptionItem } from "../../api/options.api";
import { getHoroscopeUploadUrl } from "../../api/profile.api";
import { getAuthErrorMessage, getImageUrl } from "../../api/client";
import {
  uploadOptimizedImage,
  uploadToR2,
  isAllowedImageType
} from "../../utils/mediaUpload";
import * as FileSystem from "expo-file-system/legacy";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { Input } from "../../components/ui/Input";
import { Dropdown } from "../../components/ui/Dropdown";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { BrideGroomPhotosSection } from "../../components/matrimony/BrideGroomPhotosSection";
import { appAlert } from "../../utils/appAlert";
import {
  LOOKING_FOR_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  RASHI_OPTIONS,
  NAKSHATRAM_OPTIONS,
  DOSHAM_OPTIONS,
  FAMILY_TYPE_OPTIONS
} from "../../types/profile.types";

const emptyForm = (): MatrimonyProfileData => ({
  matrimonyProfileActive: true,
  lookingFor: null,
  partnerGenderPreference: null,
  candidatePhotoUrl: null,
  profilePhotoUrl: null,
  useAccountProfilePhoto: false,
  candidatePhotoStatus: null,
  height: null,
  complexion: null,
  motherTongue: "Tamil",
  aboutMe: null,
  gotra: null,
  education: null,
  occupation: null,
  employer: null,
  annualIncome: null,
  maritalStatus: null,
  rashi: null,
  nakshatram: null,
  dosham: "No",
  motherName: null,
  fatherOccupation: null,
  brothersCount: 0,
  sistersCount: 0,
  familyType: null,
  partnerAgeMin: 21,
  partnerAgeMax: 35,
  preferredDistrictIds: [],
  preferredKulamIds: [],
  horoscopeDocumentUrl: null
});

function ChipMultiSelect({
  items,
  selected,
  onToggle,
  excludeIds = []
}: {
  items: OptionItem[];
  selected: number[];
  onToggle: (id: number) => void;
  excludeIds?: number[];
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
      {items
        .filter((i) => !excludeIds.includes(i.id))
        .map((item, index) => {
          const active = selected.includes(item.id);
          return (
            <Pressable
              key={`kulam-${item.id}-${index}`}
              onPress={() => onToggle(item.id)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: active ? "#EFF6FF" : colors.surfaceElevated,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "600", color: active ? colors.primary : colors.text }}>
                {item.name}
              </Text>
            </Pressable>
          );
        })}
    </View>
  );
}

export function MatrimonySetupScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<MatrimonyProfileData>(emptyForm());
  const [userKulam, setUserKulam] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [locations, setLocations] = useState<OptionItem[]>([]);
  const [kulams, setKulams] = useState<OptionItem[]>([]);
  const [formOptions, setFormOptions] = useState<Awaited<ReturnType<typeof getMatrimonyFormOptions>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [horoscopeUploading, setHoroscopeUploading] = useState(false);
  const [completion, setCompletion] = useState(0);
  const [hubStatus, setHubStatus] = useState<MatrimonyHub["status"]>("DRAFT");
  const [changeRequest, setChangeRequest] = useState<MatrimonyHub["pending"]>(null);
  const [requestedFields, setRequestedFields] = useState<Set<string>>(new Set());
  const [accountProfilePhoto, setAccountProfilePhoto] = useState<string | null>(null);

  const needsCorrection = (field: string) =>
    requestedFields.has(field) ||
    (field === "candidatePhotoUrl" && requestedFields.has("profilePhotoUrl"));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [hub, locs, klist, opts] = await Promise.all([
        getMatrimonyHub(),
        getLocations(),
        getKulams(),
        getMatrimonyFormOptions()
      ]);
      setLocations(locs);
      setKulams(klist);
      setFormOptions(opts);
      setUserKulam(hub.user_context.kulam);
      setUserName(hub.user_context.full_name);
      setCompletion(hub.completion_percentage);
      setHubStatus(hub.status);
      setChangeRequest(hub.pending);
      setRequestedFields(new Set(hub.pending?.requested_fields ?? []));

      const base = hub.status === "CHANGES_REQUESTED" || hub.status === "REJECTED"
        ? { ...emptyForm(), ...(hub.draft ?? {}) }
        : {
            ...emptyForm(),
            ...(hub.draft ?? {}),
            ...(hub.approved ?? {})
          };

      const merged = {
        ...base,
        candidatePhotoUrl: base.candidatePhotoUrl ?? base.profilePhotoUrl ?? null,
        profilePhotoUrl: base.candidatePhotoUrl ?? base.profilePhotoUrl ?? null,
        useAccountProfilePhoto: base.useAccountProfilePhoto ?? false,
        motherTongue: base.motherTongue ?? "Tamil",
        kulamSnapshot: base.kulamSnapshot ?? hub.user_context.kulam ?? null
      };
      setForm(merged);
      setAccountProfilePhoto(hub.account_profile_photo ?? hub.user_context.profile_image ?? null);
      if (hub.status === "PENDING" || hub.status === "RESUBMITTED") {
        appAlert(
          "Under review",
          hub.status === "RESUBMITTED"
            ? "Your corrected profile is awaiting admin review."
            : "Your profile is pending admin approval."
        );
        navigation.goBack();
        return;
      }
    } catch (e) {
      appAlert("Error", e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patch = (partial: Partial<MatrimonyProfileData>) => setForm((f) => ({ ...f, ...partial }));

  const toggleId = (field: "preferredDistrictIds" | "preferredKulamIds", id: number) => {
    setForm((f) => {
      const list = [...(f[field] ?? [])];
      const idx = list.indexOf(id);
      if (idx >= 0) list.splice(idx, 1);
      else list.push(id);
      return { ...f, [field]: list };
    });
  };

  const ownKulamId = kulams.find((k) => k.name === userKulam)?.id;

  const pickAndUploadMatrimonyPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      appAlert("Permission needed", "Allow photo access to upload bride/groom photos.");
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
    const mime = asset.mimeType ?? "image/jpeg";
    if (!isAllowedImageType(mime)) {
      appAlert("Invalid format", "Photo must be JPEG, PNG, or WebP.");
      return;
    }
    try {
      setPhotoUploading(true);
      const { publicUrl } = await uploadOptimizedImage(asset.uri, "matrimony");
      patch({
        candidatePhotoUrl: publicUrl,
        profilePhotoUrl: publicUrl,
        useAccountProfilePhoto: false,
        candidatePhotoStatus: "PENDING_REVIEW"
      });
    } catch (e) {
      appAlert("Upload failed", e instanceof Error ? e.message : "Could not upload photo");
    } finally {
      setPhotoUploading(false);
    }
  };

  const useAccountPhotoForMatrimony = () => {
    if (!accountProfilePhoto) {
      appAlert("No account photo", "Upload a profile photo in Edit Profile first, or upload a matrimony photo.");
      return;
    }
    patch({
      useAccountProfilePhoto: true,
      candidatePhotoUrl: null,
      profilePhotoUrl: null,
      candidatePhotoStatus: "PENDING_REVIEW"
    });
  };

  const uploadHoroscope = async () => {
    try {
      const pick = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/png"],
        copyToCacheDirectory: true
      });
      if (pick.canceled || !pick.assets?.[0]) return;
      const asset = pick.assets[0];
      const mime = (asset.mimeType ?? "application/pdf").toLowerCase();
      let fileSize = asset.size ?? 0;
      if (fileSize <= 0) {
        const info = await FileSystem.getInfoAsync(asset.uri);
        if (info.exists && "size" in info && typeof info.size === "number") {
          fileSize = info.size;
        }
      }
      if (fileSize <= 0) {
        appAlert("Error", "Could not read file size. Try again or pick a smaller file.");
        return;
      }

      setHoroscopeUploading(true);
      let publicUrl: string;
      if (mime.startsWith("image/") && isAllowedImageType(mime)) {
        ({ publicUrl } = await uploadOptimizedImage(asset.uri, "matrimony"));
      } else if (mime === "application/pdf") {
        const fileName = asset.name?.trim() || `horoscope_${Date.now()}.pdf`;
        const { uploadUrl, publicUrl: url } = await getHoroscopeUploadUrl({
          fileName,
          fileType: "application/pdf",
          fileSize
        });
        await uploadToR2(uploadUrl, asset.uri, mime);
        publicUrl = url;
      } else {
        appAlert("Invalid format", "Horoscope must be a PDF or image (JPEG/PNG).");
        return;
      }
      patch({ horoscopeDocumentUrl: publicUrl });
    } catch (e) {
      appAlert("Upload failed", e instanceof Error ? e.message : "Could not upload horoscope");
    } finally {
      setHoroscopeUploading(false);
    }
  };

  const persistDraft = async () => {
    const payload = {
      ...form,
      kulamSnapshot: userKulam,
      matrimonyProfileActive: true
    };
    const hub = await saveMatrimonyDraft(payload);
    setCompletion(hub.completion_percentage);
    return hub;
  };

  const onNext = async () => {
    setSaving(true);
    try {
      await persistDraft();
      setStep(1);
    } catch (e) {
      appAlert("Save failed", e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = async () => {
    setSaving(true);
    try {
      const hub = await submitMatrimonyProfile({
        ...form,
        kulamSnapshot: userKulam,
        matrimonyProfileActive: true
      });
      const alreadyQueued =
        hub.message?.includes("already under review") ||
        hub.message?.includes("already resubmitted");
      appAlert(
        alreadyQueued ? "Already submitted" : hubStatus === "CHANGES_REQUESTED" ? "Resubmitted" : "Submitted",
        hub.message ??
          (hubStatus === "CHANGES_REQUESTED"
            ? "Your updated profile has been sent back for admin review. Thank you for making the corrections."
            : "Your matrimony profile has been submitted for admin approval."),
        [{ text: "OK", onPress: () => navigation.replace("MatrimonyHome") }]
      );
      setCompletion(hub.completion_percentage);
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string; missing?: string[] } } };
      const missing = ax.response?.data?.missing;
      const base = getAuthErrorMessage(e);
      const detail =
        missing?.length && missing.length <= 6
          ? `${base}\n\nMissing: ${missing.join(", ")}`
          : base;
      appAlert("Submit failed", detail);
    } finally {
      setSaving(false);
    }
  };

  const s = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl + insets.bottom },
        section: {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: spacing.lg,
          marginBottom: spacing.md,
          borderWidth: 1,
          borderColor: colors.border
        },
        sectionTitle: {
          fontSize: 12,
          fontWeight: "700",
          color: colors.textSecondary,
          textTransform: "uppercase",
          letterSpacing: 0.8,
          marginBottom: spacing.md
        },
        label: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginBottom: 6, marginTop: 8 },
        progressBg: {
          height: 6,
          backgroundColor: colors.border,
          borderRadius: 4,
          overflow: "hidden",
          marginBottom: spacing.md
        },
        progressFill: { height: "100%", backgroundColor: colors.primary },
        photoBox: {
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: colors.surfaceElevated,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          borderWidth: 2,
          borderColor: colors.border,
          borderStyle: "dashed"
        },
        info: {
          backgroundColor: "#FEF3C7",
          padding: spacing.md,
          borderRadius: radius.md,
          marginBottom: spacing.md
        },
        infoText: { fontSize: 12, color: "#92400E", lineHeight: 18 },
        correctionBanner: {
          backgroundColor: "#FFEDD5",
          borderRadius: radius.md,
          padding: spacing.md,
          marginBottom: spacing.md,
          borderLeftWidth: 4,
          borderLeftColor: "#EA580C"
        },
        correctionField: {
          borderColor: "#EA580C",
          borderWidth: 2
        },
        fieldNote: { fontSize: 11, color: "#C2410C", marginBottom: 6, fontWeight: "600" },
        stepTabs: { flexDirection: "row", gap: 8, marginBottom: spacing.lg },
        stepTab: {
          flex: 1,
          paddingVertical: 10,
          borderRadius: radius.md,
          alignItems: "center",
          backgroundColor: colors.surfaceElevated
        },
        stepTabActive: { backgroundColor: "#EFF6FF" }
      }),
    [colors, insets.bottom]
  );

  if (loading || !formOptions) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const incomeOptions = formOptions.income_ranges.map((r) => ({ label: r.label, value: r.code }));

  return (
    <AppKeyboardAvoidingView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text, marginBottom: 4 }}>Matrimony Profile</Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: spacing.md }}>
          {userName} · {completion}% complete
        </Text>
        <View style={s.progressBg}>
          <View style={[s.progressFill, { width: `${completion}%` }]} />
        </View>

        {hubStatus === "CHANGES_REQUESTED" && changeRequest?.change_request && (
          <View style={s.correctionBanner}>
            <Text style={{ fontWeight: "800", color: "#9A3412", fontSize: 15 }}>Admin requested corrections</Text>
            <Text style={{ color: "#9A3412", marginTop: 8, lineHeight: 20 }}>
              {changeRequest.change_request.comment}
            </Text>
            {changeRequest.change_request.sections.length > 0 && (
              <Text style={{ color: "#9A3412", marginTop: 8, fontSize: 12 }}>
                Sections:{" "}
                {changeRequest.change_request.sections.map((k) => SECTION_LABELS[k] ?? k).join(", ")}
              </Text>
            )}
          </View>
        )}

        <View style={s.stepTabs}>
          <Pressable style={[s.stepTab, step === 0 && s.stepTabActive]} onPress={() => setStep(0)}>
            <Text style={{ fontWeight: "700", color: colors.text }}>Step 1</Text>
          </Pressable>
          <Pressable style={[s.stepTab, step === 1 && s.stepTabActive]} onPress={() => setStep(1)}>
            <Text style={{ fontWeight: "700", color: colors.text }}>Step 2</Text>
          </Pressable>
        </View>

        {step === 0 && (
          <>
            <View style={[s.section, needsCorrection("aboutMe") ? s.correctionField : null]}>
              <Text style={s.sectionTitle}>Personal details</Text>
              <Dropdown
                label="Who is this matrimony profile for? *"
                placeholder="Select"
                value={form.lookingFor ?? ""}
                options={formOptions?.profile_for?.length ? formOptions.profile_for : LOOKING_FOR_OPTIONS}
                onSelect={(v) => {
                  const lookingFor = (v as MatrimonyProfileData["lookingFor"]) ?? null;
                  if (lookingFor && lookingFor !== "SELF") {
                    patch({
                      lookingFor,
                      useAccountProfilePhoto: false,
                      candidatePhotoUrl: form.candidatePhotoUrl,
                      profilePhotoUrl: form.candidatePhotoUrl ?? form.profilePhotoUrl
                    });
                  } else {
                    patch({ lookingFor });
                  }
                }}
              />
              {form.lookingFor && form.lookingFor !== "SELF" && (
                <>
                  <Text style={s.label}>Bride/groom name *</Text>
                  <Input
                    value={form.candidateName ?? ""}
                    onChangeText={(t) => patch({ candidateName: t || null })}
                    placeholder="Candidate full name"
                  />
                  <Text style={s.label}>Bride/groom age *</Text>
                  <Input
                    value={form.candidateAge != null ? String(form.candidateAge) : ""}
                    onChangeText={(t) => {
                      const n = parseInt(t, 10);
                      patch({ candidateAge: Number.isNaN(n) ? null : n });
                    }}
                    placeholder="Age"
                    keyboardType="number-pad"
                  />
                </>
              )}
              <BrideGroomPhotosSection
                form={form}
                accountProfilePhoto={accountProfilePhoto}
                needsCorrection={needsCorrection("candidatePhotoUrl")}
                photoUploading={photoUploading}
                onUseAccountPhoto={useAccountPhotoForMatrimony}
                onUploadMatrimonyPhoto={pickAndUploadMatrimonyPhoto}
                onClearUseAccount={() =>
                  patch({ useAccountProfilePhoto: false, candidatePhotoUrl: null, profilePhotoUrl: null })
                }
              />
              {needsCorrection("candidatePhotoUrl") && (
                <Text style={s.fieldNote}>
                  ⚠ Admin requested: update {MATRIMONY_FIELD_LABELS.candidatePhotoUrl}
                </Text>
              )}
              <Text style={s.label}>About me *</Text>
              {needsCorrection("aboutMe") && (
                <Text style={s.fieldNote}>⚠ Please improve your About me section</Text>
              )}
              <Input
                value={form.aboutMe ?? ""}
                onChangeText={(t) => patch({ aboutMe: t || null })}
                placeholder="Describe yourself (max 300 chars)"
                multiline
                maxLength={300}
              />
              <Dropdown
                label="Partner gender preference *"
                placeholder="Select"
                value={form.partnerGenderPreference ?? ""}
                options={formOptions.partner_gender}
                onSelect={(v) => patch({ partnerGenderPreference: (v as "MALE" | "FEMALE") ?? null })}
              />
              <Dropdown
                label="Height *"
                placeholder="Select height"
                value={form.height ?? ""}
                options={formOptions.heights}
                onSelect={(v) => patch({ height: v || null })}
              />
              <Dropdown
                label="Complexion *"
                placeholder="Select"
                value={form.complexion ?? ""}
                options={formOptions.complexions}
                onSelect={(v) => patch({ complexion: v || null })}
              />
              <Dropdown
                label="Marital status *"
                placeholder="Select"
                value={form.maritalStatus ?? ""}
                options={MARITAL_STATUS_OPTIONS}
                onSelect={(v) => patch({ maritalStatus: v || null })}
              />
            </View>

            <View style={[s.section, needsCorrection("kulamSnapshot") || needsCorrection("gotra") ? s.correctionField : null]}>
              <Text style={s.sectionTitle}>Religion & community</Text>
              {(needsCorrection("kulamSnapshot") || needsCorrection("gotra")) && (
                <Text style={s.fieldNote}>⚠ Admin requested kulam / community corrections</Text>
              )}
              <Text style={s.label}>Your kulam (from profile)</Text>
              <Text style={{ fontWeight: "600", color: colors.text, marginBottom: 8 }}>{userKulam ?? "Not set — update in Edit Profile"}</Text>
              <Text style={s.label}>Gotra *</Text>
              <Input value={form.gotra ?? ""} onChangeText={(t) => patch({ gotra: t || null })} placeholder="Enter gotra" />
              <Dropdown label="Rashi *" placeholder="Select" value={form.rashi ?? ""} options={RASHI_OPTIONS} onSelect={(v) => patch({ rashi: v || null })} />
              <Dropdown
                label="Nakshatram *"
                placeholder="Select"
                value={form.nakshatram ?? ""}
                options={NAKSHATRAM_OPTIONS}
                onSelect={(v) => patch({ nakshatram: v || null })}
              />
              <Dropdown label="Dosham *" placeholder="Select" value={form.dosham ?? ""} options={DOSHAM_OPTIONS} onSelect={(v) => patch({ dosham: v || null })} />
            </View>

            <PrimaryButton title={saving ? "Saving…" : "Save & continue"} onPress={onNext} disabled={saving} loading={saving} />
          </>
        )}

        {step === 1 && (
          <>
            <View style={s.section}>
              <Text style={s.sectionTitle}>Education & career</Text>
              <Input value={form.education ?? ""} onChangeText={(t) => patch({ education: t || null })} placeholder="Highest education *" />
              <Input value={form.occupation ?? ""} onChangeText={(t) => patch({ occupation: t || null })} placeholder="Occupation *" />
              <Input value={form.employer ?? ""} onChangeText={(t) => patch({ employer: t || null })} placeholder="Employer *" />
              <Dropdown
                label="Annual income *"
                placeholder="Select range"
                value={form.annualIncome ?? ""}
                options={incomeOptions}
                onSelect={(v) => patch({ annualIncome: v || null })}
              />
            </View>

            <View style={s.section}>
              <Text style={s.sectionTitle}>Family</Text>
              <Input value={form.motherName ?? ""} onChangeText={(t) => patch({ motherName: t || null })} placeholder="Mother's name *" />
              <Input
                value={form.fatherOccupation ?? ""}
                onChangeText={(t) => patch({ fatherOccupation: t || null })}
                placeholder="Father's occupation *"
              />
              <Input
                value={String(form.brothersCount ?? 0)}
                onChangeText={(t) => patch({ brothersCount: parseInt(t, 10) || 0 })}
                placeholder="Brothers *"
                keyboardType="number-pad"
              />
              <Input
                value={String(form.sistersCount ?? 0)}
                onChangeText={(t) => patch({ sistersCount: parseInt(t, 10) || 0 })}
                placeholder="Sisters *"
                keyboardType="number-pad"
              />
              <Dropdown
                label="Family type *"
                placeholder="Select"
                value={form.familyType ?? ""}
                options={FAMILY_TYPE_OPTIONS}
                onSelect={(v) => patch({ familyType: v || null })}
              />
            </View>

            <View style={s.section}>
              <Text style={s.sectionTitle}>Partner preferences</Text>
              <Input
                value={String(form.partnerAgeMin ?? "")}
                onChangeText={(t) => patch({ partnerAgeMin: parseInt(t, 10) || null })}
                placeholder="Min age *"
                keyboardType="number-pad"
              />
              <Input
                value={String(form.partnerAgeMax ?? "")}
                onChangeText={(t) => patch({ partnerAgeMax: parseInt(t, 10) || null })}
                placeholder="Max age *"
                keyboardType="number-pad"
              />
              <Text style={s.label}>Preferred districts *</Text>
              <ChipMultiSelect
                items={locations}
                selected={form.preferredDistrictIds ?? []}
                onToggle={(id) => toggleId("preferredDistrictIds", id)}
              />
              <Text style={s.label}>Preferred kulams * (own kulam excluded)</Text>
              <View style={s.info}>
                <Text style={s.infoText}>Same kulam marriage is not permitted. Your kulam is excluded automatically.</Text>
              </View>
              <ChipMultiSelect
                items={kulams}
                selected={form.preferredKulamIds ?? []}
                onToggle={(id) => toggleId("preferredKulamIds", id)}
                excludeIds={ownKulamId != null ? [ownKulamId] : []}
              />
            </View>

            <View style={[s.section, needsCorrection("horoscopeDocumentUrl") ? s.correctionField : null]}>
              <Text style={s.sectionTitle}>Horoscope *</Text>
              {needsCorrection("horoscopeDocumentUrl") && (
                <Text style={s.fieldNote}>⚠ Admin requested horoscope update (keep existing or re-upload)</Text>
              )}
              <PrimaryButton
                title={
                  horoscopeUploading
                    ? "Uploading horoscope…"
                    : form.horoscopeDocumentUrl
                      ? "Horoscope on file ✓ (tap to replace)"
                      : "Upload horoscope (PDF/image)"
                }
                onPress={uploadHoroscope}
                variant="outline"
                disabled={horoscopeUploading}
                loading={horoscopeUploading}
              />
            </View>

            <PrimaryButton
              title={
                saving
                  ? "Submitting…"
                  : hubStatus === "CHANGES_REQUESTED"
                    ? "Resubmit for review"
                    : "Submit for approval"
              }
              onPress={onSubmit}
              disabled={saving}
              loading={saving}
            />
            <PrimaryButton title="Save draft" onPress={async () => { setSaving(true); try { await persistDraft(); appAlert("Saved", "Draft saved."); } finally { setSaving(false); } }} variant="outline" style={{ marginTop: 8 }} />
          </>
        )}
      </ScrollView>
    </AppKeyboardAvoidingView>
  );
}
