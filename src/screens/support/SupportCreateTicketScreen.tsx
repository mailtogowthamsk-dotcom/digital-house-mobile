import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Image
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { textField, textFieldMultiline } from "../../theme/textField";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { Dropdown } from "../../components/ui/Dropdown";
import { AppKeyboardAvoidingView } from "../../components/ui/AppKeyboardAvoidingView";
import {
  BUG_CATEGORIES,
  collectSupportMetadata,
  createSupportTicket,
  type SupportBugCategory,
  type SupportTicketType
} from "../../api/support.api";
import { useAuth } from "../../context/AuthContext";
import { uploadOptimizedImage } from "../../utils/mediaUpload";
import { appAlert } from "../../utils/appAlert";
import { ensureMediaLibraryRead } from "../../permissions";
import type { RootStackParamList } from "../../navigation/types";
import {
  createSessionUploadedMedia,
  useDeleteSessionMediaOnLeave
} from "../../media/sessionUploadedMedia";

const TITLES: Record<string, string> = {
  BUG: "Report a Bug",
  FEATURE: "Request a Feature",
  QUESTION: "Ask a Question",
  CONTACT: "Contact Admin",
  GENERAL: "Support Request"
};

export function SupportCreateTicketScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, "SupportCreateTicket">>();
  const type = (route.params?.type ?? "GENERAL") as SupportTicketType;
  const { colors } = useTheme();
  const { user } = useAuth();

  const [category, setCategory] = useState<SupportBugCategory | "">("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionMedia = useRef(createSessionUploadedMedia()).current;
  const committedRef = useRef(false);
  const busyRef = useRef(false);
  busyRef.current = uploading || saving;

  useDeleteSessionMediaOnLeave(navigation, sessionMedia, {
    isCommitted: () => committedRef.current,
    isBusy: () => busyRef.current
  });

  const screenTitle = TITLES[type] ?? "Support";

  const categoryOptions = useMemo(
    () => BUG_CATEGORIES.map((c) => ({ label: c.label, value: c.value })),
    []
  );

  const pickScreenshot = async () => {
    const permission = await ensureMediaLibraryRead({
      rationaleTitle: "Attach a screenshot",
      rationaleMessage:
        "Digital House needs access to your photos so you can attach a screenshot to this support request."
    });
    if (!permission.ok) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const previousUrl = screenshotUrl;
    setScreenshotUri(asset.uri);
    setUploading(true);
    try {
      const uploaded = await uploadOptimizedImage(asset.uri, "posts", undefined, "support");
      if (previousUrl) sessionMedia.deleteTracked(previousUrl);
      sessionMedia.track(uploaded.publicUrl);
      setScreenshotUrl(uploaded.publicUrl);
    } catch (e: unknown) {
      setScreenshotUri(null);
      appAlert("Upload failed", e instanceof Error ? e.message : "Could not upload screenshot");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async () => {
    setError(null);
    if (title.trim().length < 3) {
      setError("Please enter a short title.");
      return;
    }
    if (description.trim().length < 10) {
      setError("Please describe the issue in a bit more detail.");
      return;
    }
    if (type === "BUG" && !category) {
      setError("Please select a category.");
      return;
    }
    setSaving(true);
    try {
      const ticket = await createSupportTicket({
        type,
        category: type === "BUG" ? (category as SupportBugCategory) : null,
        title: title.trim(),
        description: description.trim(),
        screenshotUrl,
        metadata: collectSupportMetadata({
          screen: screenTitle,
          community: (user as any)?.community ?? null,
          userId: user?.id
        })
      });
      sessionMedia.release();
      committedRef.current = true;
      appAlert("Submitted", `Your request ${ticket.ref} was created.`);
      navigation.replace("SupportTicketDetail", { ticketId: ticket.id });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppKeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <Text style={[styles.heading, { color: colors.text }]}>{screenTitle}</Text>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        We auto-collect app version and device info to help resolve this faster.
      </Text>

      {type === "BUG" ? (
        <Dropdown
          label="Category"
          placeholder="Select category"
          value={category}
          options={categoryOptions}
          onSelect={(v) => setCategory(v as SupportBugCategory)}
          required
        />
      ) : null}

      <Text style={[styles.label, { color: colors.textSecondary }]}>Title</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Short summary"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="What happened? What did you expect?"
        placeholderTextColor={colors.textMuted}
        multiline
        numberOfLines={5}
        textAlignVertical="top"
        style={[
          styles.input,
          styles.area,
          { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }
        ]}
      />

      <Pressable
        style={[styles.attach, { borderColor: colors.border, backgroundColor: colors.surface }]}
        onPress={() => void pickScreenshot()}
        disabled={uploading}
      >
        <Ionicons name="image-outline" size={20} color={colors.primary} />
        <Text style={{ color: colors.text, fontWeight: "600" }}>
          {uploading ? "Uploading…" : screenshotUrl ? "Change screenshot" : "Add screenshot (optional)"}
        </Text>
      </Pressable>
      {screenshotUri ? (
        <Image source={{ uri: screenshotUri }} style={styles.preview} resizeMode="cover" />
      ) : null}

      {error ? <Text style={{ color: colors.error, marginBottom: 12 }}>{error}</Text> : null}

      <PrimaryButton
        title={saving ? "Submitting…" : "Submit"}
        onPress={() => void onSubmit()}
        disabled={saving || uploading}
      />
      {(saving || uploading) && (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
      )}
    </ScrollView>
    </AppKeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  heading: { fontSize: 22, fontWeight: "800", marginBottom: 6 },
  hint: { fontSize: 13, lineHeight: 19, marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    ...textField,
    marginBottom: 8
  },
  area: { minHeight: 120, ...textFieldMultiline },
  attach: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 12,
    marginTop: 8,
    marginBottom: 8
  },
  preview: { width: "100%", height: 160, borderRadius: 12, marginBottom: 12 }
});
