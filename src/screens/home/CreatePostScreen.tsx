import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { createPost } from "../../api/posts.api";
import { getUploadUrl } from "../../api/media.api";
import type { MediaModule } from "../../api/media.api";
import { getErrorStatus } from "../../api/client";
import { uploadToR2, isAllowedImageType, validateImageSize } from "../../utils/mediaUpload";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing, radius } from "../../theme/spacing";
import { PrimaryButton } from "../../components/ui/PrimaryButton";

const POST_TYPES = [
  { value: "ANNOUNCEMENT", label: "Announcement" },
  { value: "MEETUP", label: "Community meetup" },
  { value: "ACHIEVEMENT", label: "Achievements" },
  { value: "ENTERTAINMENT", label: "Entertainment" },
  { value: "JOB", label: "Job" },
  { value: "MARKETPLACE", label: "Marketplace" },
  { value: "MATRIMONY", label: "Matrimony" },
  { value: "HELP_REQUEST", label: "Help Request" }
];

/** Map post type to R2 module for folder structure */
function postTypeToModule(postType: string): MediaModule {
  const map: Record<string, MediaModule> = {
    ANNOUNCEMENT: "posts",
    MEETUP: "posts",
    ACHIEVEMENT: "posts",
    ENTERTAINMENT: "posts",
    JOB: "jobs",
    MARKETPLACE: "marketplace",
    MATRIMONY: "matrimony",
    HELP_REQUEST: "help"
  };
  return map[postType] ?? "posts";
}

function getMimeFromUri(uri: string): string {
  const ext = uri.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  return "image/jpeg";
}

/**
 * Create Post – post_type, title, description, optional media_url.
 * On success: go back (caller can refresh feed).
 */
export function CreatePostScreen() {
  const navigation = useNavigation<any>();
  const [postType, setPostType] = useState("ANNOUNCEMENT");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaPreviewUri, setMediaPreviewUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showTypePicker, setShowTypePicker] = useState(false);

  const handleSubmit = useCallback(async () => {
    const t = title.trim();
    if (!t) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createPost({
        post_type: postType,
        title: t,
        description: description.trim() || null,
        media_url: mediaUrl.trim() || null
      });
      navigation.goBack();
    } catch (e) {
      const status = getErrorStatus(e);
      if (status === 401) navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      else if (status === 403) navigation.reset({ index: 0, routes: [{ name: "PendingApproval" }] });
      else setError((e as any)?.response?.data?.message ?? "Failed to create post");
    } finally {
      setSaving(false);
    }
  }, [postType, title, description, mediaUrl, navigation]);

  const pickAndUploadImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow access to photos to upload images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.9
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const uri = asset.uri;
    const mime = getMimeFromUri(uri);
    if (!isAllowedImageType(mime)) {
      setError("Only jpg, jpeg, png allowed (≤ 5 MB)");
      return;
    }
    const fileSize = asset.fileSize ?? 0;
    if (fileSize > 0) validateImageSize(fileSize);
    const fileName = uri.split("/").pop() ?? "image.jpg";
    setError(null);
    setUploading(true);
    setUploadProgress(0);
    try {
      const { uploadUrl: putUrl, publicUrl } = await getUploadUrl({
        fileName,
        fileType: mime,
        fileSize: fileSize || 1024,
        module: postTypeToModule(postType)
      });
      await uploadToR2(putUrl, uri, mime, (p) => setUploadProgress(p));
      setMediaUrl(publicUrl);
      setMediaPreviewUri(uri);
    } catch (e) {
      const status = getErrorStatus(e);
      if (status === 401) navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      else if (status === 403) navigation.reset({ index: 0, routes: [{ name: "PendingApproval" }] });
      else setError((e as any)?.message ?? "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [postType, navigation]);

  const clearMedia = useCallback(() => {
    setMediaUrl("");
    setMediaPreviewUri(null);
  }, []);

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.label}>Post type</Text>
        <Pressable
          style={s.picker}
          onPress={() => setShowTypePicker(!showTypePicker)}
        >
          <Text style={s.pickerText}>
            {POST_TYPES.find((p) => p.value === postType)?.label ?? postType}
          </Text>
          <Ionicons
            name={showTypePicker ? "chevron-up" : "chevron-down"}
            size={20}
            color={colors.textSecondary}
          />
        </Pressable>
        {showTypePicker && (
          <View style={s.pickerOptions}>
            {POST_TYPES.map((p) => (
              <Pressable
                key={p.value}
                style={[s.pickerOption, p.value === postType && s.pickerOptionActive]}
                onPress={() => {
                  setPostType(p.value);
                  setShowTypePicker(false);
                }}
              >
                <Text style={[s.pickerOptionText, p.value === postType && s.pickerOptionTextActive]}>
                  {p.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={s.label}>Title *</Text>
        <TextInput
          style={s.input}
          placeholder="Enter title"
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={setTitle}
          editable={!saving}
        />

        <Text style={s.label}>Description</Text>
        <TextInput
          style={[s.input, s.textArea]}
          placeholder="What's on your mind?"
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          editable={!saving}
        />

        <Text style={s.label}>Image (optional)</Text>
        <Pressable
          style={[s.mediaBtn, (uploading || saving) && s.mediaBtnDisabled]}
          onPress={pickAndUploadImage}
          disabled={uploading || saving}
        >
          <Ionicons name="image-outline" size={22} color={colors.primary} />
          <Text style={s.mediaBtnText}>Pick image from gallery</Text>
        </Pressable>
        {uploading && (
          <View style={s.progressWrap}>
            <View style={s.progressBar}>
              <View style={[s.progressFill, { width: `${uploadProgress * 100}%` }]} />
            </View>
            <Text style={s.progressText}>{Math.round(uploadProgress * 100)}%</Text>
          </View>
        )}
        {mediaPreviewUri ? (
          <View style={s.previewWrap}>
            <Image source={{ uri: mediaPreviewUri }} style={s.previewImg} resizeMode="cover" />
            <Pressable style={s.removeMediaBtn} onPress={clearMedia}>
              <Ionicons name="close-circle" size={28} color={colors.error} />
            </Pressable>
          </View>
        ) : mediaUrl ? (
          <View style={s.mediaUrlRow}>
            <Text style={s.mediaUrlLabel} numberOfLines={1}>Uploaded</Text>
            <Pressable onPress={clearMedia}>
              <Text style={s.removeMediaText}>Remove</Text>
            </Pressable>
          </View>
        ) : null}
        <Text style={s.labelSecondary}>Or paste image URL</Text>
        <TextInput
          style={s.input}
          placeholder="https://..."
          placeholderTextColor={colors.textMuted}
          value={mediaUrl}
          onChangeText={(v) => { setMediaUrl(v); if (!v) setMediaPreviewUri(null); }}
          keyboardType="url"
          autoCapitalize="none"
          editable={!saving}
        />

        {error ? <Text style={s.errorText}>{error}</Text> : null}

        <View style={s.actions}>
          <PrimaryButton
            title={saving ? "Creating..." : "Create post"}
            onPress={handleSubmit}
            disabled={saving}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  label: { ...typography.caption, fontWeight: "600", color: colors.text, marginBottom: spacing.xs, marginTop: spacing.sm },
  input: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm
  },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  picker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm
  },
  pickerText: { ...typography.body, color: colors.text },
  pickerOptions: { marginBottom: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, overflow: "hidden" },
  pickerOption: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  pickerOptionActive: { backgroundColor: colors.surfaceElevated },
  pickerOptionText: { ...typography.body, color: colors.text },
  pickerOptionTextActive: { fontWeight: "600", color: colors.primary },
  errorText: { ...typography.caption, color: colors.error, marginTop: spacing.sm },
  actions: { marginTop: spacing.lg },
  mediaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md
  },
  mediaBtnDisabled: { opacity: 0.6 },
  mediaBtnText: { ...typography.caption, fontWeight: "600", color: colors.primary },
  progressWrap: { marginBottom: spacing.sm },
  progressBar: { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.primary },
  progressText: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  previewWrap: { position: "relative", marginBottom: spacing.sm, borderRadius: radius.md, overflow: "hidden" },
  previewImg: { width: "100%", height: 180, backgroundColor: colors.surfaceElevated },
  removeMediaBtn: { position: "absolute", top: 8, right: 8 },
  mediaUrlRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  mediaUrlLabel: { ...typography.caption, color: colors.success },
  removeMediaText: { ...typography.caption, color: colors.error, fontWeight: "600" },
  labelSecondary: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.xs }
});
