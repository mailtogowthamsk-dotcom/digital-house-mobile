import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  Platform
} from "react-native";
import { AppKeyboardAvoidingView } from "../../components/ui/AppKeyboardAvoidingView";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { createPost } from "../../api/posts.api";
import { getErrorStatus } from "../../api/client";
import { uploadOptimizedImage, isAllowedImageType, getMimeFromUri } from "../../utils/mediaUpload";
import { deleteMediaUrls } from "../../api/media.api";
import { MatrimonyScreenHeader } from "../../components/matrimony/MatrimonyScreenHeader";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { appAlert } from "../../utils/appAlert";
import { ensureMediaLibraryRead } from "../../permissions";
import {
  HELP_CATEGORIES,
  HELP_URGENCIES,
  HELP_MAX_PHOTOS
} from "../../constants/helpingHands";

export function CreateHelpRequestScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState<string | null>(null);
  const [urgency, setUrgency] = useState<string>("NORMAL");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionUploads = useRef<Set<string>>(new Set());

  const s = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.background },
        body: { padding: spacing.lg, paddingBottom: 40 },
        stepLabel: {
          fontSize: 13,
          fontWeight: "600",
          color: colors.primary,
          marginBottom: 6
        },
        heading: {
          fontSize: 22,
          fontWeight: "700",
          color: colors.text,
          marginBottom: 8
        },
        sub: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.lg, lineHeight: 20 },
        grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
        cat: {
          width: "47%",
          flexGrow: 1,
          padding: spacing.md,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          gap: 8
        },
        catActive: {
          borderColor: colors.primary,
          backgroundColor: colors.primary + "14"
        },
        label: {
          fontSize: 13,
          fontWeight: "600",
          color: colors.text,
          marginBottom: 8,
          marginTop: spacing.md
        },
        input: {
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 15,
          color: colors.text
        },
        area: { minHeight: 120, textAlignVertical: "top" },
        chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
        chip: {
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface
        },
        chipActive: {
          borderColor: colors.primary,
          backgroundColor: colors.primary + "18"
        },
        photoRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
        photo: {
          width: 96,
          height: 96,
          borderRadius: radius.lg,
          backgroundColor: colors.border
        },
        addPhoto: {
          width: 96,
          height: 96,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: colors.border,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surface
        },
        footer: {
          flexDirection: "row",
          gap: 10,
          padding: spacing.lg,
          paddingBottom: Math.max(insets.bottom, 16),
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.background
        }
      }),
    [colors, insets.bottom]
  );

  const pickPhotos = useCallback(async () => {
    const permission = await ensureMediaLibraryRead({
      rationaleTitle: "Attach photos",
      rationaleMessage:
        "Digital House needs access to your photos so you can attach images to this help request."
    });
    if (!permission.ok) return;
    const remaining = HELP_MAX_PHOTOS - galleryUrls.length;
    if (remaining <= 0) {
      appAlert("Photo limit", `You can add up to ${HELP_MAX_PHOTOS} photos.`);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.9
    });
    if (result.canceled || !result.assets?.length) return;
    setUploading(true);
    setError(null);
    try {
      const nextUrls = [...galleryUrls];
      const nextPreviews = [...galleryPreviews];
      for (const asset of result.assets) {
        const mime = (asset as any).mimeType || getMimeFromUri(asset.uri);
        if (!isAllowedImageType(mime)) continue;
        const { publicUrl } = await uploadOptimizedImage(asset.uri, "help");
        nextUrls.push(publicUrl);
        nextPreviews.push(asset.uri);
        sessionUploads.current.add(publicUrl);
      }
      setGalleryUrls(nextUrls.slice(0, HELP_MAX_PHOTOS));
      setGalleryPreviews(nextPreviews.slice(0, HELP_MAX_PHOTOS));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [galleryPreviews, galleryUrls]);

  const removePhoto = useCallback(
    (index: number) => {
      const url = galleryUrls[index];
      setGalleryUrls((prev) => prev.filter((_, i) => i !== index));
      setGalleryPreviews((prev) => prev.filter((_, i) => i !== index));
      if (url && sessionUploads.current.has(url)) {
        void deleteMediaUrls([url]).catch(() => {});
        sessionUploads.current.delete(url);
      }
    },
    [galleryUrls]
  );

  const canNext = useMemo(() => {
    if (step === 1) return !!category;
    if (step === 2) return title.trim().length >= 3 && description.trim().length >= 20;
    if (step === 3) return true;
    if (step === 4) return location.trim().length >= 2 && phone.trim().length >= 8;
    return false;
  }, [category, description, location, phone, step, title]);

  const publish = useCallback(async () => {
    if (!category) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createPost({
        post_type: "HELP_REQUEST",
        creation_source: "helping_hands",
        title: title.trim(),
        description: description.trim(),
        media_url: galleryUrls[0] ?? null,
        urgent: urgency === "URGENT" || urgency === "CRITICAL",
        help_category: category,
        help_urgency: urgency,
        help_location: location.trim(),
        help_contact_phone: phone.trim(),
        help_gallery: galleryUrls.length ? galleryUrls : undefined
      });
      sessionUploads.current.clear();
      navigation.replace("PostDetail", { postId: created.id });
    } catch (e) {
      const status = getErrorStatus(e);
      if (status === 401) navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      else if (status === 403)
        navigation.reset({ index: 0, routes: [{ name: "PendingApproval" }] });
      else setError((e as any)?.response?.data?.message ?? "Failed to publish request");
    } finally {
      setSaving(false);
    }
  }, [category, description, galleryUrls, location, navigation, phone, title, urgency]);

  return (
    <View style={s.root}>
      <MatrimonyScreenHeader title="Create Request" onBack={() => navigation.goBack()} />
      <AppKeyboardAvoidingView
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
          <Text style={s.stepLabel}>Step {step} of 4</Text>
          {step === 1 ? (
            <>
              <Text style={s.heading}>What kind of help?</Text>
              <Text style={s.sub}>Choose one category so the right people can find you.</Text>
              <View style={s.grid}>
                {HELP_CATEGORIES.map((c) => (
                  <Pressable
                    key={c.value}
                    style={[s.cat, category === c.value && s.catActive]}
                    onPress={() => setCategory(c.value)}
                  >
                    <Ionicons
                      name={c.icon}
                      size={22}
                      color={category === c.value ? colors.primary : colors.textMuted}
                    />
                    <Text
                      style={{
                        fontWeight: "700",
                        color: category === c.value ? colors.primary : colors.text
                      }}
                    >
                      {c.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={s.label}>Urgency</Text>
              <View style={s.chipRow}>
                {HELP_URGENCIES.map((u) => (
                  <Pressable
                    key={u.value}
                    style={[s.chip, urgency === u.value && s.chipActive]}
                    onPress={() => setUrgency(u.value)}
                  >
                    <Text
                      style={{
                        fontWeight: "600",
                        color: urgency === u.value ? colors.primary : colors.textMuted
                      }}
                    >
                      {u.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Text style={s.heading}>Tell your story</Text>
              <Text style={s.sub}>A clear title and short description help people respond faster.</Text>
              <Text style={s.label}>Title</Text>
              <TextInput
                style={s.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Need blood donors for surgery"
                placeholderTextColor={colors.textMuted}
                maxLength={255}
              />
              <Text style={s.label}>Description (min 20 characters)</Text>
              <TextInput
                style={[s.input, s.area]}
                value={description}
                onChangeText={setDescription}
                placeholder="Share what you need and how someone can help…"
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={5000}
              />
            </>
          ) : null}

          {step === 3 ? (
            <>
              <Text style={s.heading}>Photos (optional)</Text>
              <Text style={s.sub}>
                Add a cover or supporting images if they help explain the request.
              </Text>
              <View style={s.photoRow}>
                {galleryPreviews.map((uri, i) => (
                  <Pressable key={uri + i} onLongPress={() => removePhoto(i)}>
                    <Image source={{ uri }} style={s.photo} />
                  </Pressable>
                ))}
                {galleryUrls.length < HELP_MAX_PHOTOS ? (
                  <Pressable style={s.addPhoto} onPress={() => void pickPhotos()} disabled={uploading}>
                    <Ionicons name="camera-outline" size={28} color={colors.textMuted} />
                    <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
                      {uploading ? "Uploading…" : "Add"}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              <Text style={{ marginTop: 12, fontSize: 12, color: colors.textMuted }}>
                Long-press a photo to remove it.
              </Text>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <Text style={s.heading}>Location & contact</Text>
              <Text style={s.sub}>Helpers need a place and a way to reach you.</Text>
              <Text style={s.label}>Location</Text>
              <TextInput
                style={s.input}
                value={location}
                onChangeText={setLocation}
                placeholder="City / area"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={s.label}>Contact phone</Text>
              <TextInput
                style={s.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Phone number"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
            </>
          ) : null}

          {error ? (
            <Text style={{ color: colors.error, marginTop: spacing.md }}>{error}</Text>
          ) : null}
        </ScrollView>

        <View style={s.footer}>
          {step > 1 ? (
            <View style={{ flex: 1 }}>
              <PrimaryButton title="Back" variant="secondary" onPress={() => setStep((x) => x - 1)} />
            </View>
          ) : null}
          <View style={{ flex: 1 }}>
            {step < 4 ? (
              <PrimaryButton
                title="Continue"
                disabled={!canNext}
                onPress={() => setStep((x) => x + 1)}
              />
            ) : (
              <PrimaryButton
                title="Publish"
                loading={saving}
                disabled={!canNext || saving}
                onPress={() => void publish()}
              />
            )}
          </View>
        </View>
      </AppKeyboardAvoidingView>
    </View>
  );
}
