import React, { useState, useCallback, useMemo, useEffect, useLayoutEffect, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, Image, Dimensions } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { createPost, updatePost, getPost } from "../../api/posts.api";
import { emitPostCreated } from "../../utils/postSync";
import { postDetailToProfileItem } from "../../utils/postMappers";
import type { MediaModule } from "../../api/media.api";
import { getErrorStatus } from "../../api/client";
import { uploadOptimizedImage, isAllowedImageType, getMimeFromUri } from "../../utils/mediaUpload";
import { deleteMediaUrls } from "../../api/media.api";
import { useTheme } from "../../theme/ThemeContext";
import { typography } from "../../theme/typography";
import { spacing, radius } from "../../theme/spacing";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { MasterDataSuggestInput } from "../../components/masterData/MasterDataSuggestInput";
import { appAlert } from "../../utils/appAlert";
import type { RootStackParamList } from "../../navigation/types";
import { JOB_EMPLOYMENT_TYPES } from "../../constants/jobs";
import {
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_CONDITIONS,
  MARKETPLACE_INTENTS,
  MARKETPLACE_MAX_PHOTOS
} from "../../constants/marketplace";

const POST_TYPES = [
  { value: "ANNOUNCEMENT", label: "Announcement" },
  { value: "MEETUP", label: "Community meetup" },
  { value: "ACHIEVEMENT", label: "Achievements" },
  { value: "ENTERTAINMENT", label: "Entertainment" },
  { value: "JOB", label: "Job" },
  { value: "MARKETPLACE", label: "Marketplace" },
  { value: "MATRIMONY", label: "Matrimony" }
];

/** Module contexts that must lock the post type (no dropdown). */
const LOCKED_MODULE_TYPES = new Set(["JOB", "MARKETPLACE", "HELP_REQUEST", "MATRIMONY"]);

function postTypeLabel(value: string): string {
  return POST_TYPES.find((t) => t.value === value)?.label ?? value;
}

function screenTitleForType(value: string | undefined, isEditing: boolean): string {
  if (isEditing) return "Edit listing";
  switch (value) {
    case "JOB":
      return "Post a job";
    case "MARKETPLACE":
      return "Sell something";
    case "HELP_REQUEST":
      return "Create help request";
    case "MATRIMONY":
      return "Matrimony post";
    default:
      return "Create Post";
  }
}

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

function resolveInitialPostType(value: string | undefined): string {
  if (!value) return "ANNOUNCEMENT";
  if (POST_TYPES.some((t) => t.value === value) || LOCKED_MODULE_TYPES.has(value)) return value;
  return "ANNOUNCEMENT";
}

/**
 * Create Post – post_type, title, description, optional media_url.
 * On success: go back (caller can refresh feed).
 */
export function CreatePostScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, "CreatePost">>();
  const { colors } = useTheme();
  const initialTypeParam = route.params?.initialPostType;
  const editPostId = route.params?.editPostId;
  const isEditing = editPostId != null && editPostId > 0;
  /** When opened from Jobs / Marketplace / etc., type is fixed to that module. */
  const isTypeLocked =
    isEditing ||
    (Boolean(initialTypeParam) && LOCKED_MODULE_TYPES.has(String(initialTypeParam).toUpperCase()));

  const [postType, setPostType] = useState(() =>
    resolveInitialPostType(initialTypeParam)
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [jobCompany, setJobCompany] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [jobEmploymentType, setJobEmploymentType] = useState<string>("FULL_TIME");
  const [jobSalaryMin, setJobSalaryMin] = useState("");
  const [jobSalaryMax, setJobSalaryMax] = useState("");
  const [showEmploymentPicker, setShowEmploymentPicker] = useState(false);
  const [mpIntent, setMpIntent] = useState<string>("SALE");
  const [mpCategory, setMpCategory] = useState<string>("OTHERS");
  const [mpCondition, setMpCondition] = useState<string>("GOOD");
  const [mpPrice, setMpPrice] = useState("");
  const [mpNegotiable, setMpNegotiable] = useState(false);
  const [mpDistrict, setMpDistrict] = useState("");
  const [showMpIntentPicker, setShowMpIntentPicker] = useState(false);
  const [showMpCategoryPicker, setShowMpCategoryPicker] = useState(false);
  const [showMpConditionPicker, setShowMpConditionPicker] = useState(false);
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaPreviewUri, setMediaPreviewUri] = useState<string | null>(null);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  /** URLs uploaded in this screen session — safe to delete from R2 immediately on clear. */
  const sessionUploadedUrlsRef = useRef<Set<string>>(new Set());
  const [previewDimensions, setPreviewDimensions] = useState<{ width: number; height: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(isEditing);
  const [mpStatus, setMpStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!isTypeLocked || !initialTypeParam) return;
    setPostType(resolveInitialPostType(initialTypeParam));
    setShowTypePicker(false);
  }, [initialTypeParam, isTypeLocked]);

  useLayoutEffect(() => {
    navigation.setOptions?.({
      title: screenTitleForType(isTypeLocked ? postType : undefined, isEditing)
    });
  }, [navigation, postType, isTypeLocked, isEditing]);

  const s = useCreatePostStyles(colors);
  const screenWidth = Dimensions.get("window").width - spacing.lg * 2;
  const PREVIEW_MAX_HEIGHT = 400;
  const previewHeight = previewDimensions
    ? Math.min(screenWidth * (previewDimensions.height / previewDimensions.width), PREVIEW_MAX_HEIGHT)
    : 200;

  useEffect(() => {
    if (!isEditing || editPostId == null) return;
    let cancelled = false;
    (async () => {
      try {
        const post = await getPost(editPostId);
        if (cancelled) return;
        if (post.post_type !== "MARKETPLACE") {
          setError("Only marketplace listings can be edited here");
          setLoadingEdit(false);
          return;
        }
        setPostType("MARKETPLACE");
        setTitle(post.title ?? "");
        setDescription(post.description ?? "");
        const gallery =
          post.marketplace_gallery && post.marketplace_gallery.length > 0
            ? post.marketplace_gallery
            : post.media_url
              ? [post.media_url]
              : [];
        setGalleryUrls(gallery);
        setGalleryPreviews(gallery);
        setMediaUrl(gallery[0] ?? post.media_url ?? "");
        setMediaPreviewUri(gallery[0] ?? post.media_url ?? null);
        setMpIntent(post.marketplace_intent ?? "SALE");
        setMpCategory(post.marketplace_category ?? "OTHERS");
        setMpCondition(post.marketplace_condition ?? "GOOD");
        setMpPrice(
          post.marketplace_price != null ? String(post.marketplace_price) : ""
        );
        setMpNegotiable(Boolean(post.marketplace_negotiable));
        setMpDistrict(post.marketplace_district ?? "");
        setMpStatus(post.marketplace_status ?? null);
      } catch (e) {
        if (!cancelled) {
          setError((e as any)?.response?.data?.message ?? "Failed to load listing");
        }
      } finally {
        if (!cancelled) setLoadingEdit(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editPostId, isEditing]);

  const handleSubmit = useCallback(async () => {
    const t = title.trim();
    if (!t) {
      setError("Title is required");
      return;
    }
    // Never allow switching type when opened from a module (Jobs / Marketplace / …)
    const submitType =
      isTypeLocked && initialTypeParam
        ? resolveInitialPostType(initialTypeParam)
        : isEditing
          ? "MARKETPLACE"
          : postType;
    const minSalary = jobSalaryMin.trim() ? Math.floor(Number(jobSalaryMin.trim())) : null;
    const maxSalary = jobSalaryMax.trim() ? Math.floor(Number(jobSalaryMax.trim())) : null;
    if (submitType === "JOB") {
      if (minSalary != null && (!Number.isFinite(minSalary) || minSalary < 0)) {
        setError("Enter a valid minimum salary");
        return;
      }
      if (maxSalary != null && (!Number.isFinite(maxSalary) || maxSalary < 0)) {
        setError("Enter a valid maximum salary");
        return;
      }
      if (
        (jobSalaryMin.trim() && !Number.isInteger(Number(jobSalaryMin.trim()))) ||
        (jobSalaryMax.trim() && !Number.isInteger(Number(jobSalaryMax.trim())))
      ) {
        setError("Salary must be a whole number");
        return;
      }
      if (minSalary != null && maxSalary != null && maxSalary < minSalary) {
        setError("Max salary must be greater than or equal to min salary");
        return;
      }
    }
    if (submitType === "MARKETPLACE") {
      if (description.trim().length < 20) {
        setError("Description must be at least 20 characters");
        return;
      }
      if (!mediaUrl.trim() && galleryUrls.length === 0) {
        setError("Add at least one photo for marketplace listings");
        return;
      }
      if (!mpDistrict.trim()) {
        setError("District is required");
        return;
      }
      const price = mpPrice.trim() ? Math.floor(Number(mpPrice.trim())) : null;
      if (mpIntent === "SALE") {
        if (price == null || !Number.isFinite(price) || price < 0) {
          setError("Enter a valid price for sale listings");
          return;
        }
        if (mpPrice.trim() && !Number.isInteger(Number(mpPrice.trim()))) {
          setError("Price must be a whole number");
          return;
        }
      }
    }
    setSaving(true);
    setError(null);
    try {
      const priceNum = mpPrice.trim() ? Math.floor(Number(mpPrice.trim())) : null;
      const marketplacePayload = {
        marketplace_intent: mpIntent,
        marketplace_category: mpCategory,
        marketplace_condition: mpCondition,
        marketplace_price: mpIntent === "FREE" ? null : priceNum,
        marketplace_negotiable: mpIntent === "SALE" ? mpNegotiable : false,
        marketplace_district: mpDistrict.trim(),
        marketplace_gallery:
          galleryUrls.length > 0
            ? galleryUrls
            : mediaUrl.trim()
              ? [mediaUrl.trim()]
              : undefined,
        ...(isEditing && mpStatus === "CHANGES_REQUESTED"
          ? { marketplace_status: "PENDING_REVIEW" as const }
          : {})
      };
      const coverUrl =
        (galleryUrls[0] ?? mediaUrl).trim() || null;
      if (isEditing && editPostId != null) {
        await updatePost(editPostId, {
          title: t,
          description: description.trim() || null,
          media_url: coverUrl,
          ...marketplacePayload
        });
      } else {
        const created = await createPost({
          post_type: submitType,
          title: t,
          description: description.trim() || null,
          media_url: coverUrl,
          ...(submitType === "JOB"
            ? {
                job_status: "OPEN",
                job_company: jobCompany.trim() || null,
                job_location: jobLocation.trim() || null,
                job_employment_type: jobEmploymentType || null,
                job_salary_min: minSalary,
                job_salary_max: maxSalary
              }
            : {}),
          ...(submitType === "MARKETPLACE" ? marketplacePayload : {})
        });
        emitPostCreated(postDetailToProfileItem(created));
      }
      navigation.goBack();
    } catch (e) {
      const status = getErrorStatus(e);
      if (status === 401) navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      else if (status === 403) navigation.reset({ index: 0, routes: [{ name: "PendingApproval" }] });
      else setError((e as any)?.response?.data?.message ?? "Failed to create post");
    } finally {
      setSaving(false);
    }
  }, [
    postType,
    isTypeLocked,
    initialTypeParam,
    title,
    description,
    mediaUrl,
    galleryUrls,
    jobCompany,
    jobLocation,
    jobEmploymentType,
    jobSalaryMin,
    jobSalaryMax,
    mpIntent,
    mpCategory,
    mpCondition,
    mpPrice,
    mpNegotiable,
    mpDistrict,
    mpStatus,
    isEditing,
    editPostId,
    navigation
  ]);

  const pickAndUploadImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      appAlert("Permission needed", "Allow access to photos to upload images.");
      return;
    }
    const isMp = postType === "MARKETPLACE";
    const remaining = isMp ? MARKETPLACE_MAX_PHOTOS - galleryUrls.length : 1;
    if (isMp && remaining <= 0) {
      appAlert("Photo limit", `You can add up to ${MARKETPLACE_MAX_PHOTOS} photos.`);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: !isMp,
      allowsMultipleSelection: isMp,
      selectionLimit: isMp ? remaining : 1,
      quality: 0.9
    });
    if (result.canceled || !result.assets?.length) return;

    setError(null);
    setUploading(true);
    setUploadProgress(0);
    try {
      if (!isMp) {
        const asset = result.assets[0];
        const uri = asset.uri;
        const mime = (asset as any).mimeType || getMimeFromUri(uri);
        if (!isAllowedImageType(mime)) {
          setError("Only JPEG, PNG, or WebP images are allowed");
          return;
        }
        const { publicUrl, width, height } = await uploadOptimizedImage(
          uri,
          postTypeToModule(postType),
          (p) => setUploadProgress(p)
        );
        setMediaUrl(publicUrl);
        setMediaPreviewUri(uri);
        setPreviewDimensions({ width, height });
        sessionUploadedUrlsRef.current.add(publicUrl);
        return;
      }

      const nextUrls = [...galleryUrls];
      const nextPreviews = [...galleryPreviews];
      for (let i = 0; i < result.assets.length; i++) {
        const asset = result.assets[i];
        const uri = asset.uri;
        const mime = (asset as any).mimeType || getMimeFromUri(uri);
        if (!isAllowedImageType(mime)) {
          setError("Only JPEG, PNG, or WebP images are allowed");
          continue;
        }
        const { publicUrl } = await uploadOptimizedImage(
          uri,
          postTypeToModule(postType),
          (p) =>
            setUploadProgress((i + p) / result.assets.length)
        );
        nextUrls.push(publicUrl);
        nextPreviews.push(uri);
        sessionUploadedUrlsRef.current.add(publicUrl);
      }
      setGalleryUrls(nextUrls.slice(0, MARKETPLACE_MAX_PHOTOS));
      setGalleryPreviews(nextPreviews.slice(0, MARKETPLACE_MAX_PHOTOS));
      setMediaUrl(nextUrls[0] ?? "");
      setMediaPreviewUri(nextPreviews[0] ?? null);
    } catch (e) {
      const statusCode = getErrorStatus(e);
      if (statusCode === 401) navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      else if (statusCode === 403) navigation.reset({ index: 0, routes: [{ name: "PendingApproval" }] });
      else setError((e as any)?.message ?? "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [postType, navigation, galleryUrls, galleryPreviews]);

  const clearMedia = useCallback(() => {
    const toDelete = [
      ...galleryUrls,
      ...(mediaUrl ? [mediaUrl] : [])
    ].filter((u) => sessionUploadedUrlsRef.current.has(u));
    setMediaUrl("");
    setMediaPreviewUri(null);
    setPreviewDimensions(null);
    setGalleryUrls([]);
    setGalleryPreviews([]);
    for (const u of toDelete) sessionUploadedUrlsRef.current.delete(u);
    if (toDelete.length > 0) {
      void deleteMediaUrls([...new Set(toDelete)]).catch(() => {
        /* best-effort R2 cleanup */
      });
    }
  }, [galleryUrls, mediaUrl]);

  const removeGalleryAt = useCallback((index: number) => {
    const removedUrl = galleryUrls[index];
    setGalleryUrls((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setMediaUrl(next[0] ?? "");
      return next;
    });
    setGalleryPreviews((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setMediaPreviewUri(next[0] ?? null);
      return next;
    });
    if (removedUrl && sessionUploadedUrlsRef.current.has(removedUrl)) {
      sessionUploadedUrlsRef.current.delete(removedUrl);
      void deleteMediaUrls([removedUrl]).catch(() => {
        /* best-effort R2 cleanup */
      });
    }
  }, [galleryUrls]);

  if (loadingEdit) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: colors.textSecondary }}>Loading listing…</Text>
      </View>
    );
  }

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
        {!isEditing && !isTypeLocked ? (
          <>
            <Text style={s.label}>Post type</Text>
            <Pressable
              style={s.picker}
              onPress={() => setShowTypePicker(!showTypePicker)}
            >
              <Text style={s.pickerText}>
                {postTypeLabel(postType)}
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
          </>
        ) : (
          <>
            <Text style={s.label}>
              {isEditing ? "Editing marketplace listing" : "Posting as"}
            </Text>
            <View style={s.lockedType}>
              <Ionicons
                name={
                  postType === "JOB"
                    ? "briefcase-outline"
                    : postType === "MARKETPLACE"
                      ? "cart-outline"
                      : postType === "HELP_REQUEST"
                        ? "hand-left-outline"
                        : "pricetag-outline"
                }
                size={18}
                color={colors.primary}
              />
              <Text style={s.lockedTypeText}>{postTypeLabel(postType)}</Text>
            </View>
            {isEditing && mpStatus === "CHANGES_REQUESTED" ? (
              <Text style={{ color: colors.textSecondary, marginBottom: spacing.sm, fontSize: 13 }}>
                Update the details below, then save to resubmit for admin review.
              </Text>
            ) : !isEditing && isTypeLocked ? (
              <Text style={s.lockedHint}>
                This form is for {postTypeLabel(postType).toLowerCase()} only. To create a different
                type, use Create Post from Home or Menu.
              </Text>
            ) : null}
          </>
        )}

        <Text style={s.label}>Title *</Text>
        <TextInput
          style={s.input}
          placeholder={postType === "JOB" ? "Job title (e.g. Sales Executive)" : "Enter title"}
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={setTitle}
          editable={!saving}
        />

        {postType === "JOB" ? (
          <>
            <Text style={s.label}>Company</Text>
            <TextInput
              style={s.input}
              placeholder="Company / business name"
              placeholderTextColor={colors.textMuted}
              value={jobCompany}
              onChangeText={setJobCompany}
              editable={!saving}
            />

            <Text style={s.label}>Location</Text>
            <MasterDataSuggestInput
              value={jobLocation}
              onChangeText={setJobLocation}
              onSelect={(label) => setJobLocation(label)}
              placeholder="City / district from master data"
              types={["DISTRICT", "TOWN", "TALUK"]}
              editable={!saving}
              returnKeyType="done"
            />

            <Text style={s.label}>Employment type</Text>
            <Pressable
              style={s.picker}
              onPress={() => setShowEmploymentPicker(!showEmploymentPicker)}
            >
              <Text style={s.pickerText}>
                {JOB_EMPLOYMENT_TYPES.find((t) => t.value === jobEmploymentType)?.label ??
                  jobEmploymentType}
              </Text>
              <Ionicons
                name={showEmploymentPicker ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
            {showEmploymentPicker ? (
              <View style={s.pickerOptions}>
                {JOB_EMPLOYMENT_TYPES.map((t) => (
                  <Pressable
                    key={t.value}
                    style={[
                      s.pickerOption,
                      t.value === jobEmploymentType && s.pickerOptionActive
                    ]}
                    onPress={() => {
                      setJobEmploymentType(t.value);
                      setShowEmploymentPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        s.pickerOptionText,
                        t.value === jobEmploymentType && s.pickerOptionTextActive
                      ]}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <Text style={s.label}>Salary range (₹ / month, optional)</Text>
            <View style={s.salaryRow}>
              <TextInput
                style={[s.input, s.salaryInput]}
                placeholder="Min"
                placeholderTextColor={colors.textMuted}
                value={jobSalaryMin}
                onChangeText={setJobSalaryMin}
                keyboardType="number-pad"
                editable={!saving}
              />
              <Text style={s.salaryDash}>–</Text>
              <TextInput
                style={[s.input, s.salaryInput]}
                placeholder="Max"
                placeholderTextColor={colors.textMuted}
                value={jobSalaryMax}
                onChangeText={setJobSalaryMax}
                keyboardType="number-pad"
                editable={!saving}
              />
            </View>
          </>
        ) : null}

        {postType === "MARKETPLACE" ? (
          <>
            <Text style={s.label}>Listing type *</Text>
            <Pressable style={s.picker} onPress={() => setShowMpIntentPicker(!showMpIntentPicker)}>
              <Text style={s.pickerText}>
                {MARKETPLACE_INTENTS.find((t) => t.value === mpIntent)?.label ?? mpIntent}
              </Text>
              <Ionicons
                name={showMpIntentPicker ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
            {showMpIntentPicker ? (
              <View style={s.pickerOptions}>
                {MARKETPLACE_INTENTS.map((t) => (
                  <Pressable
                    key={t.value}
                    style={[s.pickerOption, t.value === mpIntent && s.pickerOptionActive]}
                    onPress={() => {
                      setMpIntent(t.value);
                      setShowMpIntentPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        s.pickerOptionText,
                        t.value === mpIntent && s.pickerOptionTextActive
                      ]}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <Text style={s.label}>Category *</Text>
            <Pressable
              style={s.picker}
              onPress={() => setShowMpCategoryPicker(!showMpCategoryPicker)}
            >
              <Text style={s.pickerText}>
                {MARKETPLACE_CATEGORIES.find((t) => t.value === mpCategory)?.label ?? mpCategory}
              </Text>
              <Ionicons
                name={showMpCategoryPicker ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
            {showMpCategoryPicker ? (
              <View style={s.pickerOptions}>
                {MARKETPLACE_CATEGORIES.map((t) => (
                  <Pressable
                    key={t.value}
                    style={[s.pickerOption, t.value === mpCategory && s.pickerOptionActive]}
                    onPress={() => {
                      setMpCategory(t.value);
                      setShowMpCategoryPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        s.pickerOptionText,
                        t.value === mpCategory && s.pickerOptionTextActive
                      ]}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <Text style={s.label}>Condition *</Text>
            <Pressable
              style={s.picker}
              onPress={() => setShowMpConditionPicker(!showMpConditionPicker)}
            >
              <Text style={s.pickerText}>
                {MARKETPLACE_CONDITIONS.find((t) => t.value === mpCondition)?.label ?? mpCondition}
              </Text>
              <Ionicons
                name={showMpConditionPicker ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
            {showMpConditionPicker ? (
              <View style={s.pickerOptions}>
                {MARKETPLACE_CONDITIONS.map((t) => (
                  <Pressable
                    key={t.value}
                    style={[s.pickerOption, t.value === mpCondition && s.pickerOptionActive]}
                    onPress={() => {
                      setMpCondition(t.value);
                      setShowMpConditionPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        s.pickerOptionText,
                        t.value === mpCondition && s.pickerOptionTextActive
                      ]}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <Text style={s.label}>District *</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Coimbatore"
              placeholderTextColor={colors.textMuted}
              value={mpDistrict}
              onChangeText={setMpDistrict}
              editable={!saving}
            />

            {mpIntent === "SALE" ? (
              <>
                <Text style={s.label}>Price (₹) *</Text>
                <TextInput
                  style={s.input}
                  placeholder="Asking price"
                  placeholderTextColor={colors.textMuted}
                  value={mpPrice}
                  onChangeText={setMpPrice}
                  keyboardType="number-pad"
                  editable={!saving}
                />
                <Pressable
                  style={[s.picker, { marginBottom: spacing.md }]}
                  onPress={() => setMpNegotiable((v) => !v)}
                >
                  <Text style={s.pickerText}>
                    {mpNegotiable ? "Negotiable: Yes" : "Negotiable: No"}
                  </Text>
                </Pressable>
              </>
            ) : null}
          </>
        ) : null}

        <Text style={s.label}>
          Description{postType === "MARKETPLACE" ? " * (min 20 chars)" : ""}
        </Text>
        <TextInput
          style={[s.input, s.textArea]}
          placeholder={
            postType === "JOB"
              ? "Role details, requirements, how to apply…"
              : postType === "MARKETPLACE"
                ? "Describe the item, meetup preference, and any defects…"
                : "What's on your mind?"
          }
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          editable={!saving}
        />

        <Text style={s.label}>
          {postType === "MARKETPLACE"
            ? `Photos * (up to ${MARKETPLACE_MAX_PHOTOS})`
            : "Image (optional)"}
        </Text>
        <Pressable
          style={[s.mediaBtn, (uploading || saving) && s.mediaBtnDisabled]}
          onPress={pickAndUploadImage}
          disabled={uploading || saving}
        >
          <Ionicons name="image-outline" size={22} color={colors.primary} />
          <Text style={s.mediaBtnText}>
            {uploading
              ? "Optimizing & uploading…"
              : postType === "MARKETPLACE"
                ? galleryUrls.length
                  ? "Add more photos"
                  : "Pick photos from gallery"
                : "Pick image from gallery"}
          </Text>
        </Pressable>
        {uploading && (
          <View style={s.progressWrap}>
            <View style={s.progressBar}>
              <View style={[s.progressFill, { width: `${uploadProgress * 100}%` }]} />
            </View>
            <Text style={s.progressText}>{Math.round(uploadProgress * 100)}%</Text>
          </View>
        )}
        {postType === "MARKETPLACE" && galleryPreviews.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {galleryPreviews.map((uri, i) => (
              <View key={`${uri}-${i}`} style={{ marginRight: 8, position: "relative" }}>
                <Image
                  source={{ uri }}
                  style={{ width: 88, height: 88, borderRadius: 8, backgroundColor: colors.surfaceElevated }}
                  resizeMode="cover"
                />
                {i === 0 ? (
                  <View
                    style={{
                      position: "absolute",
                      left: 4,
                      bottom: 4,
                      backgroundColor: "rgba(0,0,0,0.55)",
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>Cover</Text>
                  </View>
                ) : null}
                <Pressable
                  style={{ position: "absolute", top: -6, right: -6 }}
                  onPress={() => removeGalleryAt(i)}
                >
                  <Ionicons name="close-circle" size={22} color={colors.error} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        ) : mediaPreviewUri ? (
          <View style={[s.previewWrap, { height: previewHeight }]}>
            <Image source={{ uri: mediaPreviewUri }} style={s.previewImg} resizeMode="contain" />
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
        {postType !== "MARKETPLACE" ? (
          <>
            <Text style={s.labelSecondary}>Or paste image URL</Text>
            <TextInput
              style={s.input}
              placeholder="https://..."
              placeholderTextColor={colors.textMuted}
              value={mediaUrl}
              onChangeText={(v) => {
                setMediaUrl(v);
                if (!v) setMediaPreviewUri(null);
              }}
              keyboardType="url"
              autoCapitalize="none"
              editable={!saving}
            />
          </>
        ) : null}

        {error ? <Text style={s.errorText}>{error}</Text> : null}

        <View style={s.actions}>
          <PrimaryButton
            title={
              saving
                ? isEditing
                  ? "Saving..."
                  : "Creating..."
                : isEditing
                  ? mpStatus === "CHANGES_REQUESTED"
                    ? "Save & resubmit"
                    : "Save changes"
                  : postType === "JOB"
                    ? "Post job"
                    : postType === "MARKETPLACE"
                      ? "Submit for review"
                      : "Create post"
            }
            onPress={handleSubmit}
            disabled={saving}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function useCreatePostStyles(colors: import("../../theme/ThemeContext").ThemeColors) {
  return useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        scroll: { flex: 1 },
        content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
        label: {
          ...typography.caption,
          fontWeight: "600",
          color: colors.text,
          marginBottom: spacing.xs,
          marginTop: spacing.sm
        },
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
        lockedType: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          backgroundColor: colors.primary + "14",
          borderWidth: 1,
          borderColor: colors.primary + "40",
          borderRadius: radius.md,
          paddingVertical: spacing.sm + 2,
          paddingHorizontal: spacing.md,
          marginBottom: spacing.xs
        },
        lockedTypeText: {
          ...typography.body,
          fontWeight: "700",
          color: colors.primary
        },
        lockedHint: {
          ...typography.caption,
          color: colors.textSecondary,
          marginBottom: spacing.sm,
          lineHeight: 18
        },
        pickerOptions: {
          marginBottom: spacing.sm,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          overflow: "hidden"
        },
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
        progressBar: {
          height: 6,
          backgroundColor: colors.border,
          borderRadius: 3,
          overflow: "hidden"
        },
        progressFill: { height: "100%", backgroundColor: colors.primary },
        progressText: {
          ...typography.caption,
          color: colors.textSecondary,
          marginTop: 4
        },
        previewWrap: {
          position: "relative",
          marginBottom: spacing.sm,
          borderRadius: radius.md,
          overflow: "hidden",
          width: "100%",
          backgroundColor: colors.surfaceElevated
        },
        previewImg: { width: "100%", height: "100%", backgroundColor: "transparent" },
        removeMediaBtn: { position: "absolute", top: 8, right: 8 },
        mediaUrlRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: spacing.sm
        },
        mediaUrlLabel: { ...typography.caption, color: colors.success },
        removeMediaText: { ...typography.caption, color: colors.error, fontWeight: "600" },
        labelSecondary: {
          ...typography.caption,
          color: colors.textMuted,
          marginBottom: spacing.xs
        },
        salaryRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          marginBottom: spacing.sm
        },
        salaryInput: { flex: 1, marginBottom: 0 },
        salaryDash: { ...typography.body, color: colors.textSecondary, fontWeight: "600" }
      }),
    [colors]
  );
}
