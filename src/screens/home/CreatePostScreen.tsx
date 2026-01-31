import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { createPost } from "../../api/posts.api";
import { getErrorStatus } from "../../api/client";
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
  const [saving, setSaving] = useState(false);
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

        <Text style={s.label}>Media URL (optional)</Text>
        <TextInput
          style={s.input}
          placeholder="https://..."
          placeholderTextColor={colors.textMuted}
          value={mediaUrl}
          onChangeText={setMediaUrl}
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
  actions: { marginTop: spacing.lg }
});
