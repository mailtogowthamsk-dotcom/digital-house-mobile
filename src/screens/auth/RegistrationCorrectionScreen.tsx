import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Dimensions,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform
} from "react-native";
import { AppKeyboardAvoidingView } from "../../components/ui/AppKeyboardAvoidingView";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../../theme/ThemeContext";
import { spacing } from "../../theme/spacing";
import { useAuth } from "../../context/AuthContext";
import { submitRegistrationCorrection } from "../../api/auth.api";
import { uploadOptimizedImage } from "../../utils/mediaUpload";
import { appAlert } from "../../utils/appAlert";
import { getAuthErrorMessage, getErrorStatus } from "../../api/client";
import { ensureMediaLibraryRead } from "../../permissions";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const LOGO = require("../../../assets/logo_digital_house.png");

export function RegistrationCorrectionScreen() {
  const { colors } = useTheme();
  const { user, refreshSession, applyUser, signOut } = useAuth();
  const fields = user?.registrationRequestedFields ?? [];
  const needMobile = fields.includes("mobile");
  const needPhoto = fields.includes("profilePhoto");

  const [mobile, setMobile] = useState(user?.pendingMobile || user?.mobile || "");
  const [photoUrl, setPhotoUrl] = useState<string | null>(user?.pendingProfilePhoto ?? null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(user?.pendingProfilePhoto ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // If admin already moved us out of CHANGES_REQUESTED (or a prior submit succeeded), leave this screen.
  useEffect(() => {
    if (!user) return;
    if (user.status === "CHANGES_REQUESTED") return;
    void refreshSession();
  }, [user, refreshSession]);

  const gradientColors = useMemo(
    () => [colors.background, colors.surfaceElevated, colors.background] as const,
    [colors]
  );
  const s = useMemo(
    () =>
      StyleSheet.create({
        background: { flex: 1 },
        overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.15)" },
        scroll: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: 48, paddingBottom: 40 },
        logo: {
          width: Math.min(SCREEN_WIDTH * 0.36, 140),
          height: 70,
          alignSelf: "center",
          marginBottom: spacing.lg
        },
        card: {
          backgroundColor: colors.surface,
          borderRadius: 18,
          padding: spacing.xl,
          width: "100%",
          maxWidth: 420,
          alignSelf: "center"
        },
        title: {
          fontSize: 22,
          fontWeight: "700",
          color: colors.text,
          marginBottom: spacing.sm,
          textAlign: "center"
        },
        subtitle: {
          fontSize: 14,
          color: colors.textSecondary,
          lineHeight: 21,
          textAlign: "center",
          marginBottom: spacing.lg
        },
        remarksBox: {
          backgroundColor: colors.surfaceElevated,
          borderRadius: 12,
          padding: spacing.md,
          marginBottom: spacing.lg
        },
        remarksLabel: {
          fontSize: 12,
          fontWeight: "700",
          color: colors.textSecondary,
          marginBottom: 6,
          textTransform: "uppercase"
        },
        remarksText: { fontSize: 14, color: colors.text, lineHeight: 20 },
        label: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 8 },
        input: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 16,
          color: colors.text,
          marginBottom: spacing.lg
        },
        photoBtn: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: "center",
          marginBottom: spacing.md
        },
        photoBtnText: { fontSize: 15, fontWeight: "600", color: colors.primary },
        preview: {
          width: 96,
          height: 96,
          borderRadius: 48,
          alignSelf: "center",
          marginBottom: spacing.lg,
          backgroundColor: colors.surfaceElevated
        },
        lockedNote: {
          fontSize: 12,
          color: colors.textSecondary,
          textAlign: "center",
          marginBottom: spacing.lg
        },
        btn: {
          paddingVertical: 16,
          borderRadius: 14,
          alignItems: "center",
          marginBottom: spacing.md
        },
        btnText: { fontSize: 17, fontWeight: "600", color: colors.white },
        logout: { alignItems: "center", paddingVertical: 10 },
        logoutText: { fontSize: 15, fontWeight: "600", color: colors.textSecondary }
      }),
    [colors]
  );

  const pickPhoto = useCallback(async () => {
    const permission = await ensureMediaLibraryRead({
      rationaleTitle: "Add a profile photo",
      rationaleMessage:
        "Digital House needs access to your photos so you can upload the required profile picture."
    });
    if (!permission.ok) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const uri = result.assets[0].uri;
    setUploading(true);
    try {
      const uploaded = await uploadOptimizedImage(uri, "profile");
      setPhotoUrl(uploaded.publicUrl);
      setPhotoPreview(uri);
    } catch (e) {
      appAlert("Upload failed", (e as Error)?.message ?? "Could not upload photo");
    } finally {
      setUploading(false);
    }
  }, []);

  const canSubmit = (needMobile || needPhoto) && !saving && !uploading;

  const onSubmit = useCallback(async () => {
    if (user?.status && user.status !== "CHANGES_REQUESTED") {
      await refreshSession();
      appAlert("Already submitted", "Your updates are waiting for admin review.");
      return;
    }
    if (!needMobile && !needPhoto) {
      appAlert("Nothing to update", "No correction fields were requested.");
      return;
    }
    if (needMobile && !mobile.trim()) {
      appAlert("Mobile required", "Please enter your mobile number.");
      return;
    }
    if (needPhoto && !photoUrl) {
      appAlert("Photo required", "Please upload a clear profile photo.");
      return;
    }
    setSaving(true);
    try {
      const updated = await submitRegistrationCorrection({
        ...(needMobile ? { mobile: mobile.trim() } : {}),
        ...(needPhoto ? { profilePhoto: photoUrl } : {})
      });
      await applyUser(updated);
      appAlert("Submitted", "Your updates were sent for admin review.");
    } catch (e) {
      const status = getErrorStatus(e);
      if (status === 401) await signOut();
      else if (status === 403) {
        // Likely already submitted — sync and leave correction screen.
        await refreshSession();
        appAlert(
          "Already submitted",
          getAuthErrorMessage(e) || "Your updates are waiting for admin review."
        );
      } else appAlert("Submit failed", getAuthErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }, [
    user?.status,
    needMobile,
    needPhoto,
    mobile,
    photoUrl,
    applyUser,
    refreshSession,
    signOut
  ]);

  return (
    <View style={s.background}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
      <View style={s.overlay} />
      <AppKeyboardAvoidingView
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Image source={LOGO} style={s.logo} resizeMode="contain" />
          <View style={s.card}>
            <Text style={s.title}>Registration Requires Changes</Text>
            <Text style={s.subtitle}>Admin Requested Corrections</Text>

            <View style={s.remarksBox}>
              <Text style={s.remarksLabel}>Admin remarks</Text>
              <Text style={s.remarksText}>
                {user?.registrationAdminRemarks?.trim() ||
                  "Please update the requested information and submit again."}
              </Text>
            </View>

            {needMobile ? (
              <>
                <Text style={s.label}>Mobile Number</Text>
                <TextInput
                  style={s.input}
                  value={mobile}
                  onChangeText={setMobile}
                  keyboardType="phone-pad"
                  placeholder="Enter mobile number"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                />
              </>
            ) : null}

            {needPhoto ? (
              <>
                <Text style={s.label}>Profile Photo</Text>
                {photoPreview ? (
                  <Image source={{ uri: photoPreview }} style={s.preview} />
                ) : null}
                <Pressable
                  style={({ pressed }) => [s.photoBtn, pressed && { opacity: 0.85 }]}
                  onPress={pickPhoto}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <Text style={s.photoBtnText}>
                      {photoUrl ? "Replace photo" : "Upload profile photo"}
                    </Text>
                  )}
                </Pressable>
              </>
            ) : null}

            <Text style={s.lockedNote}>
              Other registration details stay locked. Only the fields above can be updated.
            </Text>

            <Pressable
              style={({ pressed }) => [{ opacity: pressed || !canSubmit ? 0.9 : 1 }]}
              onPress={onSubmit}
              disabled={!canSubmit}
            >
              <LinearGradient
                colors={[colors.primary, colors.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.btn}
              >
                {saving ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={s.btnText}>Submit Again</Text>
                )}
              </LinearGradient>
            </Pressable>

            <Pressable style={s.logout} onPress={() => void signOut()}>
              <Text style={s.logoutText}>Logout</Text>
            </Pressable>
          </View>
        </ScrollView>
      </AppKeyboardAvoidingView>
    </View>
  );
}
