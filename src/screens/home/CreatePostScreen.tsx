import React, { useState, useCallback, useMemo, useEffect, useLayoutEffect, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Image, Dimensions } from "react-native";
import { AppKeyboardAvoidingView } from "../../components/ui/AppKeyboardAvoidingView";
import { useFocusEffect, useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { createPost, updatePost, getPost } from "../../api/posts.api";
import { emitPostCreated } from "../../utils/postSync";
import { postDetailToProfileItem } from "../../utils/postMappers";
import type { MediaModule } from "../../api/media.api";
import { getErrorStatus } from "../../api/client";
import { uploadOptimizedImage, uploadVideo } from "../../utils/mediaUpload";
import { deleteMediaUrls } from "../../api/media.api";
import { useTheme } from "../../theme/ThemeContext";
import { typography } from "../../theme/typography";
import { spacing, radius } from "../../theme/spacing";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { MasterDataSuggestInput } from "../../components/masterData/MasterDataSuggestInput";
import { MediaPreview } from "../../components/media/MediaPreview";
import { UploadProgress } from "../../components/media/UploadProgress";
import { appAlert } from "../../utils/appAlert";
import { ensureMediaLibraryRead } from "../../permissions";
import type { RootStackParamList } from "../../navigation/types";
import { JOB_EMPLOYMENT_TYPES, isValidIndianMobile, normalizeIndianMobile } from "../../constants/jobs";
import { useAuth } from "../../context/AuthContext";
import {
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_CONDITIONS,
  MARKETPLACE_INTENTS,
  MARKETPLACE_MAX_PHOTOS
} from "../../constants/marketplace";
import { formatBytes, VIDEO_PICKER_MAX_DURATION_SEC, videoUploadStageLabel, type VideoUploadStage } from "../../config/media.config";
import { cleanupTempVideoUri } from "../../services/videoProcessing.service";
import {
  extractHashtagsFromText,
  mergeHashtags,
  parseHashtagFieldInput,
  formatHashtagDisplay
} from "../../utils/hashtagParser";
import {
  PostVisibilitySelector,
  type PostVisibilityChoice
} from "../../components/posts/PostVisibilitySelector";
import { pendingMediaDraft, type PendingMediaAsset } from "../../media/pendingMediaDraft";
import { assetFromPickerResult } from "../../media/pickerAsset";

/** Home Feed / general Create Post — module types are created only from their own screens. */
const FEED_POST_TYPES = [
  { value: "ANNOUNCEMENT", label: "Announcement" },
  { value: "MEETUP", label: "Community meetup" },
  { value: "ACHIEVEMENT", label: "Achievements" },
  { value: "ENTERTAINMENT", label: "Entertainment" }
];

/** Module contexts that must lock the post type (no dropdown). */
const LOCKED_MODULE_TYPES = new Set(["JOB", "MARKETPLACE", "HELP_REQUEST", "MATRIMONY"]);

const MODULE_TYPE_LABELS: Record<string, string> = {
  JOB: "Job",
  MARKETPLACE: "Marketplace",
  MATRIMONY: "Matrimony",
  HELP_REQUEST: "Help request"
};

function postTypeLabel(value: string): string {
  return (
    FEED_POST_TYPES.find((t) => t.value === value)?.label ??
    MODULE_TYPE_LABELS[value] ??
    value
  );
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
  const upper = String(value).toUpperCase();
  if (FEED_POST_TYPES.some((t) => t.value === upper) || LOCKED_MODULE_TYPES.has(upper)) {
    return upper;
  }
  return "ANNOUNCEMENT";
}

function creationSourceForType(postType: string): "feed" | "jobs" | "marketplace" | "helping_hands" {
  switch (postType) {
    case "JOB":
      return "jobs";
    case "MARKETPLACE":
      return "marketplace";
    case "HELP_REQUEST":
      return "helping_hands";
    default:
      return "feed";
  }
}

/**
 * Create Post – post_type, title, description, optional media_url.
 * On success: go back (caller can refresh feed).
 */
export function CreatePostScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, "CreatePost">>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const registeredMobile = useMemo(() => {
    const raw = user?.mobile?.trim() ?? "";
    if (!raw) return null;
    const normalized = normalizeIndianMobile(raw);
    return isValidIndianMobile(normalized) ? normalized : null;
  }, [user?.mobile]);
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
  const [visibility, setVisibility] = useState<PostVisibilityChoice>("PUBLIC");
  const [hashtagsInput, setHashtagsInput] = useState("");
  const [jobCompany, setJobCompany] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [jobEmploymentType, setJobEmploymentType] = useState<string>("FULL_TIME");
  const [jobSalaryMin, setJobSalaryMin] = useState("");
  const [jobSalaryMax, setJobSalaryMax] = useState("");
  /** registered = use account mobile; custom = recruitment number field */
  const [jobContactSource, setJobContactSource] = useState<"registered" | "custom">("registered");
  const [jobContactPhone, setJobContactPhone] = useState("");
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
  const [mediaKind, setMediaKind] = useState<"image" | "video" | null>(null);
  const [mediaFileName, setMediaFileName] = useState<string | null>(null);
  const [mediaDurationSec, setMediaDurationSec] = useState<number | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  /** Local media confirmed in preview — uploaded only on submit. */
  const [pendingUpload, setPendingUpload] = useState<PendingMediaAsset | null>(null);
  /** Marketplace local photos not yet on CDN (aligned after remote galleryUrls). */
  const [pendingGallery, setPendingGallery] = useState<PendingMediaAsset[]>([]);
  /** URLs uploaded in this screen session — safe to delete from R2 immediately on clear. */
  const sessionUploadedUrlsRef = useRef<Set<string>>(new Set());
  /** When true, uploaded media is attached to a saved post — do not orphan-delete on leave. */
  const mediaCommittedRef = useRef(false);
  const submittingRef = useRef(false);
  const uploadingRef = useRef(false);
  const [previewDimensions, setPreviewDimensions] = useState<{ width: number; height: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<VideoUploadStage | null>(null);
  const [uploadFailed, setUploadFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(isEditing);
  const [mpStatus, setMpStatus] = useState<string | null>(null);

  const previewHashtags = useMemo(
    () =>
      mergeHashtags(
        extractHashtagsFromText(title),
        extractHashtagsFromText(description),
        parseHashtagFieldInput(hashtagsInput)
      ),
    [title, description, hashtagsInput]
  );

  useEffect(() => {
    if (!isTypeLocked || !initialTypeParam) return;
    setPostType(resolveInitialPostType(initialTypeParam));
    setShowTypePicker(false);
  }, [initialTypeParam, isTypeLocked]);

  // Abandon cleanup: leave Create Post without saving → delete session R2 uploads.
  useEffect(() => {
    const unsub = navigation.addListener("beforeRemove", (e: { preventDefault: () => void }) => {
      if (mediaCommittedRef.current) return;
      if (submittingRef.current || uploadingRef.current) {
        // Don't leave mid-upload/save — avoids deleting live assets or orphaning in-flight uploads.
        e.preventDefault();
        return;
      }
      const abandoned = [...sessionUploadedUrlsRef.current];
      if (abandoned.length === 0) return;
      sessionUploadedUrlsRef.current.clear();
      void deleteMediaUrls(abandoned).catch(() => {
        /* best-effort; server orphan job is the safety net */
      });
    });
    return unsub;
  }, [navigation]);

  useLayoutEffect(() => {
    navigation.setOptions?.({
      title: screenTitleForType(isTypeLocked ? postType : undefined, isEditing)
    });
  }, [navigation, postType, isTypeLocked, isEditing]);

  const applyPendingAsset = useCallback((asset: PendingMediaAsset) => {
    setPendingUpload(asset);
    setMediaUrl("");
    setMediaPreviewUri(asset.uri);
    setMediaKind(asset.kind);
    setMediaFileName(asset.fileName);
    setMediaDurationSec(asset.durationSec);
    setThumbnailUrl(null);
    setMimeType(asset.mimeType);
    setFileSize(asset.fileSize);
    setPreviewDimensions(
      asset.kind === "image" && asset.width && asset.height
        ? { width: asset.width, height: asset.height }
        : null
    );
    setUploadFailed(false);
    setError(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const outcome = pendingMediaDraft.consumeResult();
      if (!outcome) return;
      if (outcome.result === "removed") {
        if (postType === "MARKETPLACE") {
          setPendingGallery([]);
          setGalleryPreviews([...galleryUrls]);
          if (galleryUrls.length === 0) {
            setMediaUrl("");
            setMediaPreviewUri(null);
            setMediaKind(null);
          } else {
            setMediaUrl(galleryUrls[0]);
            setMediaPreviewUri(galleryUrls[0]);
            setMediaKind("image");
          }
          return;
        }
        setPendingUpload(null);
        setMediaUrl("");
        setMediaPreviewUri(null);
        setMediaKind(null);
        setMediaFileName(null);
        setMediaDurationSec(null);
        setThumbnailUrl(null);
        setMimeType(null);
        setFileSize(null);
        setPreviewDimensions(null);
        return;
      }
      if (outcome.result === "confirmed" && outcome.asset) {
        if (postType === "MARKETPLACE") {
          setPendingGallery([outcome.asset]);
          setPendingUpload(null);
          setGalleryPreviews([...galleryUrls, outcome.asset.uri]);
          setMediaPreviewUri(galleryUrls[0] ?? outcome.asset.uri);
          setMediaUrl(galleryUrls[0] ?? "");
          setMediaKind("image");
          setMediaFileName(outcome.asset.fileName);
          setMimeType(outcome.asset.mimeType);
          setFileSize(outcome.asset.fileSize);
          setUploadFailed(false);
          setError(null);
          return;
        }
        applyPendingAsset(outcome.asset);
      }
    }, [applyPendingAsset, postType, galleryUrls])
  );

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
        if (post.post_type !== "MARKETPLACE" && post.post_type !== "JOB") {
          setError("Only marketplace and job listings can be edited here");
          setLoadingEdit(false);
          return;
        }
        setPostType(post.post_type === "JOB" ? "JOB" : "MARKETPLACE");
        setTitle(post.title ?? "");
        setDescription(post.description ?? "");
        setVisibility(post.visibility === "CONNECTIONS" ? "CONNECTIONS" : "PUBLIC");
        if (post.post_type === "JOB") {
          setJobCompany(post.job_company ?? "");
          setJobLocation(post.job_location ?? "");
          setJobEmploymentType(post.job_employment_type ?? "FULL_TIME");
          setJobSalaryMin(
            post.job_salary_min != null ? String(post.job_salary_min) : ""
          );
          setJobSalaryMax(
            post.job_salary_max != null ? String(post.job_salary_max) : ""
          );
          const contact = post.job_contact_phone?.trim()
            ? normalizeIndianMobile(post.job_contact_phone)
            : "";
          if (contact && registeredMobile && contact === registeredMobile) {
            setJobContactSource("registered");
            setJobContactPhone("");
          } else if (contact) {
            setJobContactSource("custom");
            setJobContactPhone(contact);
          } else if (registeredMobile) {
            setJobContactSource("registered");
            setJobContactPhone("");
          } else {
            setJobContactSource("custom");
            setJobContactPhone("");
          }
          setMediaUrl(post.media_url ?? "");
          setMediaPreviewUri(post.media_url ?? null);
          setLoadingEdit(false);
          return;
        }
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
  }, [editPostId, isEditing, registeredMobile]);

  useEffect(() => {
    if (isEditing) return;
    if (!registeredMobile && jobContactSource === "registered") {
      setJobContactSource("custom");
    }
  }, [isEditing, jobContactSource, registeredMobile]);

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current || uploading) return;
    const t = title.trim();
    if (!t) {
      setError("Title is required");
      return;
    }
    // Never allow switching type when opened from a module (Jobs / Marketplace / …)
    const submitType =
      isTypeLocked && initialTypeParam
        ? resolveInitialPostType(initialTypeParam)
        : postType;
    if (
      !isEditing &&
      !isTypeLocked &&
      (LOCKED_MODULE_TYPES.has(submitType) || submitType === "MATRIMONY")
    ) {
      setError("This post type can only be created from its dedicated module.");
      return;
    }
    const minSalary = jobSalaryMin.trim() ? Math.floor(Number(jobSalaryMin.trim())) : null;
    const maxSalary = jobSalaryMax.trim() ? Math.floor(Number(jobSalaryMax.trim())) : null;
    let jobContactNormalized: string | null = null;
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
      const contactRaw =
        jobContactSource === "registered" ? registeredMobile ?? "" : jobContactPhone;
      jobContactNormalized = normalizeIndianMobile(contactRaw);
      if (!isValidIndianMobile(jobContactNormalized)) {
        setError(
          jobContactSource === "registered" && !registeredMobile
            ? "No registered mobile on your account. Enter a recruitment number."
            : "Enter a valid 10-digit contact number"
        );
        return;
      }
    }
    if (submitType === "MARKETPLACE") {
      if (description.trim().length < 20) {
        setError("Description must be at least 20 characters");
        return;
      }
      if (!mediaUrl.trim() && galleryUrls.length === 0 && pendingGallery.length === 0) {
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
    submittingRef.current = true;
    setError(null);
    try {
      let coverUrl = (galleryUrls[0] ?? mediaUrl).trim() || null;
      let nextGalleryUrls = [...galleryUrls];
      let nextMediaKind = mediaKind;
      let nextThumb = thumbnailUrl;
      let nextDuration = mediaDurationSec;
      let nextMime = mimeType;
      let nextSize = fileSize;

      // Upload deferred local media only after the user confirms post details.
      if (submitType === "MARKETPLACE" && pendingGallery.length > 0) {
        setUploading(true);
        uploadingRef.current = true;
        setUploadProgress(0);
        setUploadFailed(false);
        for (let i = 0; i < pendingGallery.length; i++) {
          const local = pendingGallery[i];
          const uploaded = await uploadOptimizedImage(
            local.uri,
            postTypeToModule(submitType),
            (p) => setUploadProgress((i + p) / pendingGallery.length)
          );
          nextGalleryUrls.push(uploaded.publicUrl);
          sessionUploadedUrlsRef.current.add(uploaded.publicUrl);
        }
        setPendingGallery([]);
        setGalleryUrls(nextGalleryUrls.slice(0, MARKETPLACE_MAX_PHOTOS));
        coverUrl = nextGalleryUrls[0] ?? coverUrl;
        setMediaUrl(coverUrl ?? "");
        setUploading(false);
        uploadingRef.current = false;
        setUploadProgress(0);
      } else if (pendingUpload) {
        setUploading(true);
        uploadingRef.current = true;
        setUploadProgress(0);
        setUploadStage(null);
        setUploadFailed(false);
        if (pendingUpload.kind === "video") {
          setUploadStage("compressing");
          const uploaded = await uploadVideo(pendingUpload.uri, postTypeToModule(submitType), {
            mimeType: pendingUpload.mimeType,
            durationSec: pendingUpload.durationSec ?? 0,
            fileName: pendingUpload.fileName,
            coverFrameMs: pendingUpload.coverFrameMs ?? 500,
            tempFileUri: pendingUpload.tempFileUri ?? null,
            onProgress: (p) => setUploadProgress(p),
            onStage: (stage) => setUploadStage(stage)
          });
          coverUrl = uploaded.publicUrl;
          nextMediaKind = "video";
          nextThumb = uploaded.thumbnailUrl;
          nextDuration =
            uploaded.durationSec > 0
              ? uploaded.durationSec
              : pendingUpload.durationSec;
          nextMime = uploaded.mimeType;
          nextSize = uploaded.byteSize;
          sessionUploadedUrlsRef.current.add(uploaded.publicUrl);
          if (uploaded.thumbnailUrl) sessionUploadedUrlsRef.current.add(uploaded.thumbnailUrl);
          setMediaUrl(uploaded.publicUrl);
          setMediaPreviewUri(uploaded.thumbnailUri || pendingUpload.uri);
          setThumbnailUrl(uploaded.thumbnailUrl);
          setMediaDurationSec(nextDuration);
          setMimeType(nextMime);
          setFileSize(nextSize);
        } else {
          const uploaded = await uploadOptimizedImage(
            pendingUpload.uri,
            postTypeToModule(submitType),
            (p) => setUploadProgress(p)
          );
          coverUrl = uploaded.publicUrl;
          nextMediaKind = "image";
          nextThumb = null;
          nextDuration = null;
          nextMime = uploaded.mimeType;
          nextSize = uploaded.byteSize;
          sessionUploadedUrlsRef.current.add(uploaded.publicUrl);
          setMediaUrl(uploaded.publicUrl);
          setThumbnailUrl(null);
          setMimeType(nextMime);
          setFileSize(nextSize);
          setPreviewDimensions({ width: uploaded.width, height: uploaded.height });
        }
        setPendingUpload(null);
        setUploading(false);
        uploadingRef.current = false;
        setUploadStage(null);
        setUploadProgress(0);
      }

      const mergedHashtags = mergeHashtags(
        extractHashtagsFromText(title),
        extractHashtagsFromText(description),
        parseHashtagFieldInput(hashtagsInput)
      );
      const priceNum = mpPrice.trim() ? Math.floor(Number(mpPrice.trim())) : null;
      const marketplacePayload = {
        marketplace_intent: mpIntent,
        marketplace_category: mpCategory,
        marketplace_condition: mpCondition,
        marketplace_price: mpIntent === "FREE" ? null : priceNum,
        marketplace_negotiable: mpIntent === "SALE" ? mpNegotiable : false,
        marketplace_district: mpDistrict.trim(),
        marketplace_gallery:
          nextGalleryUrls.length > 0
            ? nextGalleryUrls
            : coverUrl
              ? [coverUrl]
              : undefined,
        ...(isEditing && mpStatus === "CHANGES_REQUESTED"
          ? { marketplace_status: "PENDING_REVIEW" as const }
          : {})
      };
      const mediaPayload =
        submitType === "MARKETPLACE"
          ? {
              media_url: coverUrl,
              media_type: coverUrl ? ("image" as const) : ("none" as const)
            }
          : {
              media_url: coverUrl,
              media_type: coverUrl
                ? nextMediaKind === "video"
                  ? ("video" as const)
                  : ("image" as const)
                : ("none" as const),
              thumbnail_url: nextMediaKind === "video" ? nextThumb : null,
              video_duration: nextMediaKind === "video" ? nextDuration : null,
              mime_type: nextMime,
              file_size: nextSize
            };
      if (isEditing && editPostId != null) {
        await updatePost(editPostId, {
          title: t,
          description: description.trim() || null,
          visibility,
          hashtags: mergedHashtags,
          ...mediaPayload,
          ...(submitType === "MARKETPLACE" ? marketplacePayload : {}),
          ...(submitType === "JOB"
            ? {
                job_company: jobCompany.trim() || null,
                job_location: jobLocation.trim() || null,
                job_employment_type: jobEmploymentType || null,
                job_salary_min: minSalary,
                job_salary_max: maxSalary,
                job_contact_phone: jobContactNormalized
              }
            : {})
        });
        mediaCommittedRef.current = true;
        sessionUploadedUrlsRef.current.clear();
      } else {
        const created = await createPost({
          post_type: submitType,
          creation_source: creationSourceForType(submitType),
          visibility,
          title: t,
          description: description.trim() || null,
          hashtags: mergedHashtags,
          ...mediaPayload,
          ...(submitType === "JOB"
            ? {
                job_status: "OPEN",
                job_company: jobCompany.trim() || null,
                job_location: jobLocation.trim() || null,
                job_employment_type: jobEmploymentType || null,
                job_salary_min: minSalary,
                job_salary_max: maxSalary,
                job_contact_phone: jobContactNormalized
              }
            : {}),
          ...(submitType === "MARKETPLACE" ? marketplacePayload : {})
        });
        mediaCommittedRef.current = true;
        sessionUploadedUrlsRef.current.clear();
        try {
          emitPostCreated(postDetailToProfileItem(created));
        } catch {
          /* post already saved — ignore sync emit failures */
        }
      }
      navigation.goBack();
    } catch (e) {
      setUploading(false);
      uploadingRef.current = false;
      setUploadStage(null);
      setUploadFailed(true);
      const status = getErrorStatus(e);
      if (status === 401) navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      else if (status === 403) navigation.reset({ index: 0, routes: [{ name: "PendingApproval" }] });
      else setError((e as any)?.response?.data?.message ?? (e as Error)?.message ?? "Failed to create post");
    } finally {
      setSaving(false);
      submittingRef.current = false;
    }
  }, [
    postType,
    isTypeLocked,
    initialTypeParam,
    title,
    description,
    visibility,
    hashtagsInput,
    mediaUrl,
    mediaKind,
    thumbnailUrl,
    mediaDurationSec,
    mimeType,
    fileSize,
    galleryUrls,
    pendingUpload,
    pendingGallery,
    jobCompany,
    jobLocation,
    jobEmploymentType,
    jobSalaryMin,
    jobSalaryMax,
    jobContactSource,
    jobContactPhone,
    registeredMobile,
    mpIntent,
    mpCategory,
    mpCondition,
    mpPrice,
    mpNegotiable,
    mpDistrict,
    mpStatus,
    isEditing,
    editPostId,
    navigation,
    uploading
  ]);

  const openMediaPreview = useCallback(
    (asset: PendingMediaAsset, mode: "create" | "replace") => {
      pendingMediaDraft.open(asset, mode);
      navigation.navigate("MediaPreview", {
        mode,
        allowVideo: postType !== "MARKETPLACE"
      });
    },
    [navigation, postType]
  );

  const pickMedia = useCallback(async () => {
    const permission = await ensureMediaLibraryRead({
      rationaleTitle: "Add photo or video",
      rationaleMessage:
        "Digital House needs access to your gallery so you can attach photos and videos to your post."
    });
    if (!permission.ok) return;
    const isMp = postType === "MARKETPLACE";
    const remaining = isMp
      ? MARKETPLACE_MAX_PHOTOS - (galleryUrls.length + pendingGallery.length)
      : 1;
    if (isMp && remaining <= 0) {
      appAlert("Photo limit", `You can add up to ${MARKETPLACE_MAX_PHOTOS} photos.`);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: isMp ? ["images"] : ["images", "videos"],
      allowsEditing: false,
      allowsMultipleSelection: isMp,
      selectionLimit: isMp ? remaining : 1,
      quality: 0.95,
      videoMaxDuration: VIDEO_PICKER_MAX_DURATION_SEC
    });
    if (result.canceled || !result.assets?.length) return;

    setError(null);
    setUploadFailed(false);

    if (!isMp) {
      const mapped = assetFromPickerResult(result.assets[0]);
      if (!mapped) return;
      openMediaPreview(mapped, mediaPreviewUri || pendingUpload ? "replace" : "create");
      return;
    }

    const accepted: PendingMediaAsset[] = [];
    for (const asset of result.assets) {
      const mapped = assetFromPickerResult(asset);
      if (mapped && mapped.kind === "image") accepted.push(mapped);
    }
    if (accepted.length === 0) return;

    // Marketplace: keep multi-select local until submit; single-add opens crop preview.
    if (accepted.length === 1 && galleryUrls.length + pendingGallery.length === 0) {
      openMediaPreview(accepted[0], "create");
      return;
    }

    setPendingGallery((prev) => {
      const next = [...prev, ...accepted].slice(
        0,
        Math.max(0, MARKETPLACE_MAX_PHOTOS - galleryUrls.length)
      );
      setGalleryPreviews([...galleryUrls, ...next.map((a) => a.uri)]);
      setMediaPreviewUri(galleryUrls[0] ?? next[0]?.uri ?? null);
      setMediaKind("image");
      return next;
    });
  }, [
    postType,
    galleryUrls,
    pendingGallery.length,
    mediaPreviewUri,
    pendingUpload,
    openMediaPreview
  ]);

  const clearMedia = useCallback(() => {
    const toDelete = [
      ...galleryUrls,
      ...(mediaUrl ? [mediaUrl] : []),
      ...(thumbnailUrl ? [thumbnailUrl] : [])
    ].filter((u) => sessionUploadedUrlsRef.current.has(u));
    if (pendingUpload?.tempFileUri) {
      void cleanupTempVideoUri(pendingUpload.tempFileUri);
    }
    setMediaUrl("");
    setMediaPreviewUri(null);
    setMediaKind(null);
    setMediaFileName(null);
    setMediaDurationSec(null);
    setThumbnailUrl(null);
    setMimeType(null);
    setFileSize(null);
    setPreviewDimensions(null);
    setGalleryUrls([]);
    setGalleryPreviews([]);
    setPendingUpload(null);
    setPendingGallery([]);
    setUploadFailed(false);
    for (const u of toDelete) sessionUploadedUrlsRef.current.delete(u);
    if (toDelete.length > 0) {
      void deleteMediaUrls([...new Set(toDelete)]).catch(() => {
        /* best-effort R2 cleanup */
      });
    }
  }, [galleryUrls, mediaUrl, thumbnailUrl, pendingUpload]);

  const removeGalleryAt = useCallback(
    (index: number) => {
      const remoteCount = galleryUrls.length;
      if (index < remoteCount) {
        const removedUrl = galleryUrls[index];
        setGalleryUrls((prev) => {
          const next = prev.filter((_, i) => i !== index);
          setMediaUrl(next[0] ?? pendingGallery[0]?.uri ?? "");
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
        return;
      }
      const localIndex = index - remoteCount;
      setPendingGallery((prev) => {
        const next = prev.filter((_, i) => i !== localIndex);
        setGalleryPreviews([...galleryUrls, ...next.map((a) => a.uri)]);
        setMediaPreviewUri(galleryUrls[0] ?? next[0]?.uri ?? null);
        setMediaUrl(galleryUrls[0] ?? "");
        if (galleryUrls.length + next.length === 0) setMediaKind(null);
        return next;
      });
    },
    [galleryUrls, pendingGallery]
  );

  if (loadingEdit) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: colors.textSecondary }}>Loading listing…</Text>
      </View>
    );
  }

  return (
    <AppKeyboardAvoidingView
      style={s.container}
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
                {FEED_POST_TYPES.map((p) => (
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

        <PostVisibilitySelector
          value={visibility}
          onChange={setVisibility}
          disabled={saving}
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

            <Text style={s.label}>Contact number *</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: spacing.sm, lineHeight: 17 }}>
              Shown on the job detail page for applicants to call. Keep personal and recruitment numbers separate if you prefer.
            </Text>
            {registeredMobile ? (
              <Pressable
                style={[
                  s.picker,
                  { marginBottom: spacing.sm },
                  jobContactSource === "registered" && s.pickerOptionActive
                ]}
                onPress={() => setJobContactSource("registered")}
                disabled={saving}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.pickerText}>Use my registered mobile</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                    {registeredMobile}
                  </Text>
                </View>
                <Ionicons
                  name={jobContactSource === "registered" ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={jobContactSource === "registered" ? colors.primary : colors.textMuted}
                />
              </Pressable>
            ) : null}
            <Pressable
              style={[
                s.picker,
                { marginBottom: spacing.sm },
                jobContactSource === "custom" && s.pickerOptionActive
              ]}
              onPress={() => setJobContactSource("custom")}
              disabled={saving}
            >
              <Text style={[s.pickerText, { flex: 1 }]}>Use a different recruitment number</Text>
              <Ionicons
                name={jobContactSource === "custom" ? "radio-button-on" : "radio-button-off"}
                size={20}
                color={jobContactSource === "custom" ? colors.primary : colors.textMuted}
              />
            </Pressable>
            {jobContactSource === "custom" ? (
              <TextInput
                style={s.input}
                placeholder="10-digit recruitment mobile"
                placeholderTextColor={colors.textMuted}
                value={jobContactPhone}
                onChangeText={setJobContactPhone}
                keyboardType="phone-pad"
                maxLength={14}
                editable={!saving}
              />
            ) : null}
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

        <Text style={s.label}>Hashtags (optional)</Text>
        <TextInput
          style={s.input}
          placeholder="#Temple #Community #Festival"
          placeholderTextColor={colors.textMuted}
          value={hashtagsInput}
          onChangeText={setHashtagsInput}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!saving}
        />
        {previewHashtags.length > 0 ? (
          <View style={s.hashtagChipWrap}>
            {previewHashtags.map((tag) => (
              <View
                key={tag}
                style={[s.hashtagChip, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
              >
                <Text style={[s.hashtagChipText, { color: colors.primary }]}>
                  {formatHashtagDisplay(tag)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[s.hashtagHint, { color: colors.textMuted }]}>
            Tip: type #tags in the description or add them here. Duplicates are merged.
          </Text>
        )}

        <Text style={s.label}>
          {postType === "MARKETPLACE"
            ? `Photos * (up to ${MARKETPLACE_MAX_PHOTOS})`
            : "Media (optional)"}
        </Text>
        <Pressable
          style={[s.mediaBtn, (uploading || saving) && s.mediaBtnDisabled]}
          onPress={pickMedia}
          disabled={uploading || saving}
        >
          <Ionicons
            name={postType === "MARKETPLACE" ? "images-outline" : "images-outline"}
            size={22}
            color={colors.primary}
          />
          <Text style={s.mediaBtnText}>
            {uploading
              ? "Uploading…"
              : postType === "MARKETPLACE"
                ? galleryUrls.length + pendingGallery.length
                  ? "Add more photos"
                  : "Pick photos from gallery"
                : mediaPreviewUri || pendingUpload
                  ? "Replace photo or video"
                  : "Choose Photo or Video"}
          </Text>
        </Pressable>
        {(uploading || uploadFailed) && (
          <UploadProgress
            progress={uploadProgress}
            label={
              uploading
                ? uploadStage
                  ? videoUploadStageLabel(uploadStage)
                  : mediaKind === "video" || uploadProgress > 0.3
                    ? "Uploading…"
                    : "Preparing…"
                : "Upload failed"
            }
            failed={uploadFailed && !uploading}
          />
        )}
        {uploadFailed && !uploading ? (
          <Pressable style={[s.mediaBtn, { marginTop: spacing.sm }]} onPress={pickMedia}>
            <Ionicons name="refresh" size={20} color={colors.primary} />
            <Text style={s.mediaBtnText}>Retry</Text>
          </Pressable>
        ) : null}
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
        ) : mediaPreviewUri && mediaKind ? (
          <MediaPreview
            kind={mediaKind}
            previewUri={mediaPreviewUri}
            fileName={
              mediaFileName ||
              (fileSize != null ? `${formatBytes(fileSize)}` : null)
            }
            durationSec={mediaDurationSec}
            height={previewHeight}
            onReplace={pickMedia}
            onRemove={clearMedia}
            disabled={uploading || saving}
          />
        ) : mediaUrl ? (
          <View style={s.mediaUrlRow}>
            <Text style={s.mediaUrlLabel} numberOfLines={1}>
              {mediaKind === "video" ? "Video uploaded" : "Uploaded"}
            </Text>
            <Pressable onPress={clearMedia}>
              <Text style={s.removeMediaText}>Remove</Text>
            </Pressable>
          </View>
        ) : null}

        {error ? <Text style={s.errorText}>{error}</Text> : null}

        <View style={s.actions}>
          <PrimaryButton
            title={
              saving
                ? isEditing
                  ? "Saving..."
                  : "Creating..."
                : uploading
                  ? "Uploading..."
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
            disabled={saving || uploading}
          />
        </View>
      </ScrollView>
    </AppKeyboardAvoidingView>
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
        hashtagHint: { ...typography.caption, marginBottom: spacing.sm, lineHeight: 18 },
        hashtagChipWrap: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: spacing.sm
        },
        hashtagChip: {
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: radius.lg,
          paddingHorizontal: 10,
          paddingVertical: 6
        },
        hashtagChipText: { fontSize: 13, fontWeight: "600" },
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
