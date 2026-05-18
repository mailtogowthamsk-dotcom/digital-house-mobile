import React from "react";
import { View, Text, Pressable, Image, ActivityIndicator, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { PrimaryButton } from "../ui/PrimaryButton";
import { getImageUrl } from "../../api/client";

const PHOTO_TIPS = [
  "Clear face visible",
  "Avoid sunglasses",
  "Avoid group photos",
  "Traditional or simple photos preferred",
  "Recent photos recommended"
];

export type BrideGroomPhotoForm = {
  lookingFor?: string | null;
  candidatePhotoUrl?: string | null;
  profilePhotoUrl?: string | null;
  useAccountProfilePhoto?: boolean | null;
  candidatePhotoStatus?: string | null;
};

type Props = {
  form: BrideGroomPhotoForm;
  accountProfilePhoto: string | null;
  needsCorrection: boolean;
  photoUploading: boolean;
  onUseAccountPhoto: () => void;
  onUploadMatrimonyPhoto: () => void;
  onClearUseAccount: () => void;
};

function isSelf(lookingFor: string | null | undefined): boolean {
  return String(lookingFor ?? "").toUpperCase() === "SELF";
}

function displayPhoto(form: BrideGroomPhotoForm, accountPhoto: string | null): string | null {
  const candidate = form.candidatePhotoUrl ?? form.profilePhotoUrl;
  if (candidate) return candidate;
  if (isSelf(form.lookingFor) && form.useAccountProfilePhoto && accountPhoto) {
    return accountPhoto;
  }
  return null;
}

export function BrideGroomPhotosSection({
  form,
  accountProfilePhoto,
  needsCorrection,
  photoUploading,
  onUseAccountPhoto,
  onUploadMatrimonyPhoto,
  onClearUseAccount
}: Props) {
  const { colors } = useTheme();
  const self = isSelf(form.lookingFor);
  const preview = displayPhoto(form, accountProfilePhoto);
  const status = form.candidatePhotoStatus;
  const rejected =
    status === "REJECTED" || status === "REUPLOAD_REQUESTED";

  return (
    <View
      style={[
        styles.section,
        { backgroundColor: colors.surface, borderColor: colors.border },
        needsCorrection || rejected ? styles.correction : null
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>Bride/Groom Photos</Text>
      {!form.lookingFor ? (
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Select who this matrimony profile is for above, then add photos.
        </Text>
      ) : self ? (
        <>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Use current profile photo for matrimony profile, or upload a dedicated matrimony photo.
          </Text>
          {accountProfilePhoto ? (
            <View style={styles.accountRow}>
              <Text style={[styles.subLabel, { color: colors.text }]}>Your account profile photo</Text>
              <Image
                source={{ uri: getImageUrl(accountProfilePhoto) ?? accountProfilePhoto }}
                style={styles.thumb}
              />
              <PrimaryButton
                title={
                  form.useAccountProfilePhoto && !form.candidatePhotoUrl
                    ? "Using this photo ✓"
                    : "Use This Photo"
                }
                onPress={onUseAccountPhoto}
                variant="outline"
                disabled={photoUploading}
                style={styles.btn}
              />
            </View>
          ) : null}
          <PrimaryButton
            title={photoUploading ? "Uploading…" : "Upload Different Matrimony Photo"}
            onPress={onUploadMatrimonyPhoto}
            variant="outline"
            disabled={photoUploading}
            loading={photoUploading}
            style={styles.btn}
          />
          {form.useAccountProfilePhoto && form.candidatePhotoUrl ? (
            <Pressable onPress={onClearUseAccount}>
              <Text style={{ fontSize: 12, color: colors.primary, marginTop: 4 }}>
                Clear dedicated upload (use account photo only)
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : (
        <>
          <Text style={[styles.required, { color: "#B45309" }]}>
            Please upload clear photos of the bride/groom for matrimony verification.
          </Text>
          <Text style={[styles.hint, { color: colors.textSecondary, marginTop: 4 }]}>
            Account profile photos cannot be used when the profile is for a family member.
          </Text>
          <PrimaryButton
            title={photoUploading ? "Uploading…" : "Upload Bride/Groom Photos *"}
            onPress={onUploadMatrimonyPhoto}
            disabled={photoUploading}
            loading={photoUploading}
            style={[styles.btn, { marginTop: spacing.sm }]}
          />
        </>
      )}

      {preview ? (
        <View style={styles.previewWrap}>
          <Text style={[styles.subLabel, { color: colors.text }]}>Matrimony candidate preview</Text>
          <Pressable onPress={onUploadMatrimonyPhoto} disabled={photoUploading} style={styles.photoBox}>
            {photoUploading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Image
                source={{ uri: getImageUrl(preview) ?? preview }}
                style={styles.previewImg}
              />
            )}
          </Pressable>
          {rejected && (
            <Text style={styles.rejectedNote}>
              Admin requested a better photo — please replace and resubmit.
            </Text>
          )}
        </View>
      ) : null}

      <View style={styles.tips}>
        <Text style={[styles.subLabel, { color: colors.text }]}>Photo guidelines</Text>
        {PHOTO_TIPS.map((tip) => (
          <Text key={tip} style={[styles.tipLine, { color: colors.textSecondary }]}>
            • {tip}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  correction: {
    borderColor: "#FDBA74",
    backgroundColor: "#FFF7ED"
  },
  title: { fontSize: 16, fontWeight: "800", marginBottom: spacing.sm },
  hint: { fontSize: 13, lineHeight: 18 },
  required: { fontSize: 13, fontWeight: "700", lineHeight: 18 },
  subLabel: { fontSize: 13, fontWeight: "700", marginBottom: 6 },
  accountRow: { marginTop: spacing.md },
  thumb: { width: 72, height: 72, borderRadius: radius.md, marginBottom: 8 },
  btn: { marginTop: 8, minHeight: 40 },
  previewWrap: { marginTop: spacing.md, alignItems: "center" },
  photoBox: {
    width: 120,
    height: 120,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  previewImg: { width: 120, height: 120 },
  rejectedNote: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
    color: "#B91C1C",
    textAlign: "center"
  },
  tips: { marginTop: spacing.md },
  tipLine: { fontSize: 12, marginTop: 2 }
});
