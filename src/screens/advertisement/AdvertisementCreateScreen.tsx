import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  createAdvertisement,
  getAdvertisementCatalog,
  getAdvertisementDetail,
  quoteAdvertisement,
  updateAdvertisement,
  type AdCatalog
} from "../../api/advertisement.api";
import { deleteMediaUrls } from "../../api/media.api";
import { getAuthErrorMessage } from "../../api/client";
import {
  uploadOptimizedImage,
  uploadVideo,
  validateVideoDuration,
  friendlyVideoUploadMessage,
  generateVideoThumbnail
} from "../../utils/mediaUpload";
import {
  createSessionUploadedMedia,
  useDeleteSessionMediaOnLeave
} from "../../media/sessionUploadedMedia";
import { checkoutAdvertisement } from "../../services/advertisementCheckout";
import { RazorpayCheckoutCancelledError } from "../../services/razorpayTypes";
import { AdvertisementCard } from "../../components/advertisement/AdvertisementCard";
import { MediaPreview } from "../../components/media/MediaPreview";
import { UploadProgress } from "../../components/media/UploadProgress";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { AppKeyboardAvoidingView } from "../../components/ui/AppKeyboardAvoidingView";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { textField, textFieldMultiline } from "../../theme/textField";
import { appAlert } from "../../utils/appAlert";
import { useAuth } from "../../context/AuthContext";
import { ensureMediaLibraryRead } from "../../permissions";
import { assetFromPickerResult } from "../../media/pickerAsset";
import {
  VIDEO_MAX_DURATION_SEC,
  videoUploadStageLabel,
  type VideoUploadStage
} from "../../config/media.config";
import {
  AD_BUSINESS_NAME_MAX,
  AD_BUSINESS_NAME_MIN,
  AD_CTA_MAX,
  AD_CTA_MIN,
  AD_DESCRIPTION_MAX,
  AD_DESCRIPTION_MIN,
  AD_SHORT_DESCRIPTION_MAX,
  AD_TITLE_MAX,
  AD_TITLE_MIN,
  AD_UNTITLED_DRAFT_TITLE,
  adTypeLabel,
  isEditableAdvertisement,
  inferAdvertisementDraftStep,
  isLiveCreativeEditable,
  isRasterPreviewUri,
  mediaMatchesPickerKind,
  normalizeAdvertisementUrl,
  pickerMediaKind
} from "../../utils/advertisementUi";

const STEPS = ["Type", "Media", "Details", "Contact", "Duration", "Review"] as const;

type QuoteState = {
  amountInr: number;
  amountPaise: number;
  durationDays: number;
  gstPercent: number;
  gstAmountPaise: number;
  amountBeforeGstPaise: number;
};

export function AdvertisementCreateScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const editId = Number(route.params?.id) || null;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();

  const [step, setStep] = useState(0);
  const [catalog, setCatalog] = useState<AdCatalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [typeCode, setTypeCode] = useState("IMAGE_BANNER");
  const [title, setTitle] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessCategory, setBusinessCategory] = useState("RETAIL");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [ctaLabel, setCtaLabel] = useState("Call Now");
  const [ctaType, setCtaType] = useState("CALL");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");
  const [mediaFileId, setMediaFileId] = useState<number | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [mediaKind, setMediaKind] = useState<"image" | "video" | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [uploadPhase, setUploadPhase] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFailed, setUploadFailed] = useState(false);
  const [adId, setAdId] = useState<number | null>(editId);
  const [draftStatus, setDraftStatus] = useState<string | null>(editId ? "DRAFT" : null);
  const [pricingId, setPricingId] = useState<number | null>(null);
  const [quote, setQuote] = useState<QuoteState | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(Boolean(editId));
  const uploadLock = useRef(false);
  const autoQuoteFor = useRef<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const urlFieldY = useRef(0);
  const sessionMedia = useRef(createSessionUploadedMedia()).current;
  const busyLeaveRef = useRef(false);
  busyLeaveRef.current = busy || uploadLock.current;

  useDeleteSessionMediaOnLeave(navigation, sessionMedia, {
    isBusy: () => busyLeaveRef.current
  });

  const scrollToY = useCallback((y: number) => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 20), animated: true });
    }, 320);
  }, []);

  const selectedType = (catalog?.types || []).find((t) => t.code === typeCode);
  const requiredKind = pickerMediaKind(selectedType?.mediaKind, typeCode);
  const pricingForType = (catalog?.pricing || []).filter((p) => p.typeCode === typeCode);

  useEffect(() => {
    void getAdvertisementCatalog()
      .then((c) => {
        setCatalog(c);
        setCatalogError(null);
      })
      .catch((e) => setCatalogError(getAuthErrorMessage(e)));
  }, []);

  useEffect(() => {
    if (editId || !catalog?.types.length) return;
    if (!catalog.types.some((t) => t.code === typeCode)) {
      setTypeCode(catalog.types[0].code);
    }
  }, [catalog, editId, typeCode]);

  useEffect(() => {
    if (!editId) return;
    void getAdvertisementDetail(editId)
      .then((d) => {
        const ad = d.advertisement;
        if (!ad || !isEditableAdvertisement(ad.status)) {
          appAlert("Cannot edit", "This advertisement cannot be edited right now.");
          navigation.replace("AdvertisementDetail", { id: editId });
          return;
        }
        setAdId(ad.id);
        setDraftStatus(ad.status || "DRAFT");
        setTypeCode(ad.typeCode);
        setTitle(ad.title === AD_UNTITLED_DRAFT_TITLE ? "" : ad.title || "");
        setBusinessName(ad.businessName || ad.business?.name || ad.title || "");
        setBusinessCategory(ad.businessCategory || ad.business?.category || "RETAIL");
        setShortDescription(ad.shortDescription || ad.content?.shortDescription || "");
        setDescription(ad.description || "");
        setCtaLabel(ad.ctaLabel || ad.cta?.label || "Call Now");
        setCtaType(ad.ctaType || ad.cta?.type || "CALL");
        setDestinationUrl(ad.destinationUrl || ad.websiteUrl || ad.contact?.website || "");
        setContactPhone(ad.contactPhone || ad.contact?.phone || "");
        setWhatsappNumber(ad.whatsappNumber || ad.contact?.whatsapp || "");
        setContactEmail(ad.contactEmail || ad.contact?.email || "");
        setAddress(ad.address || ad.location?.address || "");
        setCity(ad.city || ad.location?.city || "");
        setDistrict(ad.district || ad.location?.district || "");
        setStateName(ad.state || ad.location?.state || "");
        setPincode(ad.pincode || ad.location?.pincode || "");
        setMediaFileId(ad.mediaFileId ?? null);
        setMediaUrl(ad.mediaUrl || ad.thumbnailUrl || null);
        setThumbnailUrl(ad.thumbnailUrl || ad.mediaUrl || null);
        const kind = ad.mediaKind === "video" ? "video" : ad.mediaUrl ? "image" : null;
        setMediaKind(kind);
        const preview = isRasterPreviewUri(ad.thumbnailUrl, kind)
          ? ad.thumbnailUrl
          : isRasterPreviewUri(ad.mediaUrl, kind)
            ? ad.mediaUrl
            : null;
        setPreviewUri(preview);
        setUploadPhase(ad.mediaFileId ? "Ready" : null);
        if (ad.pricingSnapshot?.pricingId) setPricingId(ad.pricingSnapshot.pricingId);
        if (ad.status === "PAYMENT_PENDING") {
          setStep(4);
        } else if (ad.status === "ACTIVE") {
          setStep(1);
        } else if (ad.status === "DRAFT") {
          setStep(inferAdvertisementDraftStep(ad));
        }
      })
      .catch((e) => {
        appAlert("Could not load draft", getAuthErrorMessage(e));
        navigation.goBack();
      })
      .finally(() => setLoadingDraft(false));
  }, [editId, navigation]);

  const s = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.background, paddingTop: insets.top },
        header: { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: 8 },
        backBtn: {
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surfaceElevated
        },
        title: { ...typography.h3, color: colors.text, flex: 1 },
        scroll: { flex: 1 },
        content: { padding: spacing.md, paddingBottom: 160 },
        steps: { flexDirection: "row", paddingHorizontal: spacing.md, marginBottom: spacing.sm, gap: 4 },
        stepDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
        input: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          ...textField,
          color: colors.text,
          backgroundColor: colors.surface,
          marginBottom: spacing.sm
        },
        chip: {
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: colors.border,
          marginRight: 8,
          marginBottom: 8
        },
        hint: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.md },
        label: { ...typography.label, color: colors.text, marginBottom: 8 }
      }),
    [colors, insets.top]
  );

  const clearUploadedMedia = useCallback(async (urls: Array<string | null>) => {
    const cleaned = urls.filter((u): u is string => Boolean(u && /^https?:/i.test(u)));
    if (cleaned.length) {
      sessionMedia.untrack(...cleaned);
      await deleteMediaUrls(cleaned).catch(() => undefined);
    }
  }, [sessionMedia]);

  const resetMedia = useCallback(
    async (remoteCleanup: boolean) => {
      if (remoteCleanup) await clearUploadedMedia([mediaUrl, thumbnailUrl]);
      setMediaFileId(null);
      setMediaUrl(null);
      setThumbnailUrl(null);
      setMediaKind(null);
      setPreviewUri(null);
      setFileLabel(null);
      setDurationSec(null);
      setUploadPhase(null);
      setUploadProgress(0);
      setUploadFailed(false);
    },
    [clearUploadedMedia, mediaUrl, thumbnailUrl]
  );

  const onSelectType = useCallback(
    (code: string) => {
      if (isLiveCreativeEditable(draftStatus || "")) return;
      const next = (catalog?.types || []).find((t) => t.code === code);
      const nextKind = pickerMediaKind(next?.mediaKind, code);
      setTypeCode(code);
      setPricingId(null);
      setQuote(null);
      autoQuoteFor.current = null;
      if (!mediaMatchesPickerKind(mediaKind, nextKind)) {
        void resetMedia(true);
      }
    },
    [catalog?.types, draftStatus, mediaKind, resetMedia]
  );

  const pickMedia = useCallback(async () => {
    if (uploadLock.current || busy) return;
    const permission = await ensureMediaLibraryRead({
      rationaleTitle: requiredKind === "video" ? "Choose a video" : "Choose media",
      rationaleMessage:
        requiredKind === "video"
          ? "Digital House needs gallery access so you can attach a video to this advertisement."
          : "Digital House needs gallery access so you can attach media to this advertisement."
    });
    if (!permission.ok) return;

    const mediaTypes =
      requiredKind === "video" ? (["videos"] as const) : requiredKind === "image" ? (["images"] as const) : (["images", "videos"] as const);

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: [...mediaTypes],
      allowsEditing: false,
      quality: 0.9,
      videoMaxDuration: VIDEO_MAX_DURATION_SEC
    });
    if (result.canceled || !result.assets[0]) return;

    const mapped = assetFromPickerResult(result.assets[0]);
    if (!mapped) return;
    const pickedKind = mapped.kind;
    if (!mediaMatchesPickerKind(pickedKind, requiredKind)) {
      await appAlert(
        "Wrong media type",
        requiredKind === "video" ? "This advertisement type requires a video." : "This advertisement type requires an image."
      );
      return;
    }

    if (pickedKind === "video") {
      if (mapped.durationSec != null && mapped.durationSec > 0) {
        try {
          validateVideoDuration(mapped.durationSec);
        } catch (e) {
          await appAlert("Invalid video", e instanceof Error ? e.message : "Choose another video.");
          return;
        }
      }
    }

    uploadLock.current = true;
    setBusy(true);
    setUploadFailed(false);
    setUploadProgress(0.02);
    setMediaUrl(mapped.uri);
    setThumbnailUrl(mapped.uri);
    setMediaKind(pickedKind);
    setFileLabel(mapped.fileName || (pickedKind === "video" ? "Selected video" : "Selected image"));
    setDurationSec(pickedKind === "video" ? mapped.durationSec : null);
    let localPreview = mapped.uri;
    if (pickedKind === "video") {
      const frame = await generateVideoThumbnail(mapped.uri, 500);
      if (frame?.uri) localPreview = frame.uri;
    }
    setPreviewUri(isRasterPreviewUri(localPreview, pickedKind) ? localPreview : null);
    const previousUrls = [mediaUrl, thumbnailUrl];
    try {
      if (pickedKind === "video") {
        setUploadPhase("Uploading…");
        const uploaded = await uploadVideo(mapped.uri, "advertisements", {
          mimeType: mapped.mimeType || undefined,
          durationSec: mapped.durationSec && mapped.durationSec > 0 ? mapped.durationSec : 5,
          fileName: mapped.fileName,
          onProgress: setUploadProgress,
          onStage: (stage: VideoUploadStage) => setUploadPhase(videoUploadStageLabel(stage))
        });
        await clearUploadedMedia(previousUrls);
        setMediaFileId(uploaded.mediaFileId);
        setMediaUrl(uploaded.publicUrl);
        setThumbnailUrl(uploaded.thumbnailUrl || uploaded.publicUrl);
        sessionMedia.track(uploaded.publicUrl, uploaded.thumbnailUrl || uploaded.publicUrl);
        setDurationSec(uploaded.durationSec);
        setFileLabel(uploaded.fileName || mapped.fileName || "Video");
        const remotePreview = uploaded.thumbnailUrl || uploaded.thumbnailUri;
        setPreviewUri(
          isRasterPreviewUri(remotePreview, "video")
            ? remotePreview
            : isRasterPreviewUri(localPreview, "video")
              ? localPreview
              : null
        );
        setUploadPhase("Ready");
        setUploadProgress(1);
      } else {
        setUploadPhase("Uploading…");
        const uploaded = await uploadOptimizedImage(mapped.uri, "advertisements", (p) => {
          setUploadProgress(p);
          if (p >= 0.85) setUploadPhase("Processing media…");
        });
        await clearUploadedMedia(previousUrls);
        setMediaFileId(uploaded.mediaFileId);
        setMediaUrl(uploaded.publicUrl);
        setThumbnailUrl(uploaded.variants?.thumb || uploaded.publicUrl);
        sessionMedia.track(uploaded.publicUrl, uploaded.variants?.thumb || uploaded.publicUrl);
        setPreviewUri(uploaded.variants?.medium || uploaded.publicUrl || localPreview);
        setUploadPhase("Ready");
        setUploadProgress(1);
      }
    } catch (e) {
      setMediaFileId(null);
      setUploadFailed(true);
      setUploadPhase("Media processing failed");
      await appAlert("Upload failed", friendlyVideoUploadMessage(e));
    } finally {
      uploadLock.current = false;
      setBusy(false);
    }
  }, [busy, clearUploadedMedia, mediaUrl, requiredKind, thumbnailUrl]);

  const campaignDetailsError = (): string | null => {
    const t = title.trim();
    const b = businessName.trim();
    const d = description.trim();
    if (b.length < AD_BUSINESS_NAME_MIN) return `Business name needs at least ${AD_BUSINESS_NAME_MIN} characters.`;
    if (b.length > AD_BUSINESS_NAME_MAX) return `Business name is too long (max ${AD_BUSINESS_NAME_MAX} characters).`;
    if (t.length < AD_TITLE_MIN) return `Title needs at least ${AD_TITLE_MIN} characters.`;
    if (t.length > AD_TITLE_MAX) return `Title is too long (max ${AD_TITLE_MAX} characters).`;
    if (d.length < AD_DESCRIPTION_MIN) return `Description needs at least ${AD_DESCRIPTION_MIN} characters.`;
    if (d.length > AD_DESCRIPTION_MAX) {
      return `Description is too long (${d.length.toLocaleString()} / ${AD_DESCRIPTION_MAX}). Shorten it before continuing.`;
    }
    return null;
  };

  const contactError = (): string | null => {
    const c = ctaLabel.trim();
    if (c.length < AD_CTA_MIN) return `Call to action needs at least ${AD_CTA_MIN} characters.`;
    if (c.length > AD_CTA_MAX) return `Call to action is too long (max ${AD_CTA_MAX} characters).`;
    if (ctaType === "CALL" && !/^[6-9]\d{9}$/.test(contactPhone.replace(/\D/g, "").slice(-10))) {
      return "Add a valid 10-digit phone number for Call Now.";
    }
    if (ctaType === "WHATSAPP" && !/^[6-9]\d{9}$/.test(whatsappNumber.replace(/\D/g, "").slice(-10))) {
      return "Add a valid WhatsApp number.";
    }
    if (ctaType === "EMAIL" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      return "Add a valid email address.";
    }
    if ((ctaType === "WEBSITE" || ctaType === "CUSTOM_URL") && !normalizeAdvertisementUrl(destinationUrl)) {
      return "Add a valid website link.";
    }
    if (ctaType === "DIRECTIONS" && !address.trim() && !city.trim() && !pincode.trim()) {
      return "Add an address, city, or pincode for Get Directions.";
    }
    return null;
  };

  const goToContact = async () => {
    const err = campaignDetailsError();
    if (err) {
      await appAlert("Campaign details", err);
      return;
    }
    setStep(3);
  };

  const goToDuration = async () => {
    const detailsErr = campaignDetailsError();
    if (detailsErr) {
      await appAlert("Campaign details", detailsErr);
      return;
    }
    const err = contactError();
    if (err) {
      await appAlert("Contact & CTA", err);
      return;
    }
    if (isLiveCreativeEditable(draftStatus || "")) {
      setStep(5);
      return;
    }
    setStep(4);
  };

  const persistDraft = async () => {
    if (!typeCode) throw new Error("Choose an advertisement type first.");
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedCta = ctaLabel.trim();
    const body: Record<string, unknown> = {
      typeCode,
      placements: ["home"],
      mediaFileId,
      businessName: businessName.trim() || null,
      businessCategory,
      shortDescription: shortDescription.trim() || null,
      contactPhone: contactPhone.trim() || null,
      whatsappNumber: whatsappNumber.trim() || null,
      contactEmail: contactEmail.trim() || null,
      address: address.trim() || null,
      city: city.trim() || null,
      district: district.trim() || null,
      state: stateName.trim() || null,
      pincode: pincode.trim() || null,
      destinationUrl: normalizeAdvertisementUrl(destinationUrl),
      websiteUrl: normalizeAdvertisementUrl(destinationUrl),
      ctaType
    };
    if (trimmedCta.length >= AD_CTA_MIN) body.ctaLabel = trimmedCta;
    body.title = trimmedTitle || null;
    body.description = trimmedDescription || null;
    if (adId) {
      await updateAdvertisement(adId, body);
      sessionMedia.release();
      return adId;
    }
    const created = await createAdvertisement(body);
    setAdId(created.id);
    setDraftStatus("DRAFT");
    sessionMedia.release();
    return created.id;
  };

  const saveDraft = async () => {
    const detailsErr = campaignDetailsError();
    if (detailsErr) throw new Error(detailsErr);
    const err = contactError();
    if (err) throw new Error(err);
    return persistDraft();
  };

  const onSaveDraft = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const savedId = await persistDraft();
      await appAlert("Draft saved", "Continue Draft anytime from My Advertisements.");
      navigation.navigate("AdvertisementsHome");
      return savedId;
    } catch (e) {
      await appAlert("Could not save draft", getAuthErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const onQuote = async (id: number) => {
    setBusy(true);
    try {
      const savedId = await saveDraft();
      setPricingId(id);
      const q = await quoteAdvertisement(savedId, id);
      setQuote({
        amountInr: q.amountInr,
        amountPaise: q.amountPaise,
        durationDays: q.durationDays,
        gstPercent: q.gstPercent,
        gstAmountPaise: q.gstAmountPaise,
        amountBeforeGstPaise: q.amountBeforeGstPaise
      });
    } catch (e) {
      autoQuoteFor.current = null;
      await appAlert("Couldn't save advertisement", getAuthErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (step !== 4 || quote || busy || pricingForType.length !== 1) return;
    const id = pricingForType[0].id;
    if (autoQuoteFor.current === id) return;
    autoQuoteFor.current = id;
    void onQuote(id);
  }, [step, quote, busy, pricingForType]);

  const pay = async () => {
    if (!adId || !pricingId || busy) return;
    setBusy(true);
    try {
      await checkoutAdvertisement(adId, pricingId, {
        email: user?.email,
        name: user?.fullName
      });
      await appAlert(
        "Payment successful",
        "Your advertisement is pending admin review. It will not go live until it is approved."
      );
      navigation.replace("AdvertisementDetail", { id: adId });
    } catch (e) {
      if (e instanceof RazorpayCheckoutCancelledError) {
        await appAlert("Payment cancelled", "Checkout was cancelled. Your advertisement is still a draft until you complete payment.");
      } else {
        await appAlert("Payment failed", getAuthErrorMessage(e));
      }
    } finally {
      setBusy(false);
    }
  };

  const liveEdit = isLiveCreativeEditable(draftStatus || "");

  const submitLiveEdit = async () => {
    if (!adId || busy) return;
    const detailsErr = campaignDetailsError();
    if (detailsErr) {
      await appAlert("Campaign details", detailsErr);
      return;
    }
    const err = contactError();
    if (err) {
      await appAlert("Contact & CTA", err);
      return;
    }
    if (!mediaFileId) {
      await appAlert("Media", "Upload media before submitting this edit.");
      return;
    }
    setBusy(true);
    try {
      await persistDraft();
      await appAlert(
        "Submitted for review",
        "This advertisement is off the feed until an admin approves the new creative. Paid dates stay the same."
      );
      navigation.replace("AdvertisementDetail", { id: adId });
    } catch (e) {
      await appAlert("Could not submit", getAuthErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const uploadButtonTitle = () => {
    if (busy) return "Working…";
    if (requiredKind === "video") return mediaFileId ? "Replace video" : "Upload video";
    if (requiredKind === "image") return mediaFileId ? "Replace image" : "Upload image";
    return mediaFileId ? "Replace media" : "Upload image or video";
  };

  const saveDraftButton = liveEdit ? null : (
    <View style={{ marginTop: 12 }}>
      <PrimaryButton
        title="Save draft"
        variant="outline"
        onPress={() => void onSaveDraft()}
        disabled={busy || !typeCode}
        loading={busy}
      />
    </View>
  );

  if (loadingDraft) {
    return (
      <View style={s.root}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
        <Text style={{ textAlign: "center", color: colors.textSecondary, marginTop: 12 }}>Loading draft…</Text>
      </View>
    );
  }

  return (
    <AppKeyboardAvoidingView style={s.root} keyboardVerticalOffset={insets.top}>
      <View style={s.header}>
        <Pressable
          onPress={() => {
            if (liveEdit && (step <= 1 || step === 0)) {
              navigation.goBack();
              return;
            }
            if (liveEdit && step === 5) {
              setStep(3);
              return;
            }
            if (step === 0) navigation.goBack();
            else setStep((n) => n - 1);
          }}
          style={s.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={s.title}>
          {liveEdit
            ? "Edit advertisement"
            : draftStatus === "DRAFT" && editId
              ? "Continue Draft"
              : editId
                ? "Continue advertisement"
                : "Create advertisement"}
        </Text>
      </View>
      <View style={s.steps}>
        {STEPS.map((_, i) => (
          <View key={i} style={[s.stepDot, i <= step && { backgroundColor: colors.primary }]} />
        ))}
      </View>
      <ScrollView
        ref={scrollRef}
        style={s.scroll}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.hint}>
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </Text>

        {step === 0 ? (
          <>
            <Text style={s.label}>Advertisement type</Text>
            {liveEdit ? (
              <Text style={s.hint}>Type cannot be changed on a live campaign.</Text>
            ) : null}
            {catalogError ? <Text style={{ color: colors.error, marginBottom: 8 }}>{catalogError}</Text> : null}
            {!catalog ? <ActivityIndicator color={colors.primary} /> : null}
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {(catalog?.types || []).map((t) => (
                <Pressable
                  key={t.code}
                  onPress={() => onSelectType(t.code)}
                  style={[s.chip, typeCode === t.code && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                >
                  <Text style={{ color: typeCode === t.code ? "#fff" : colors.text }}>{t.label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={s.hint}>
              {requiredKind === "video"
                ? "Next you will upload a video."
                : requiredKind === "image"
                  ? "Next you will upload an image."
                  : "Next you can upload an image or a video."}
            </Text>
            <PrimaryButton title="Next: media" onPress={() => setStep(1)} disabled={!typeCode} />
            {saveDraftButton}
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Text style={s.label}>
              {requiredKind === "video" ? "Video" : requiredKind === "image" ? "Image" : "Media"}
            </Text>
            {(previewUri || mediaUrl) ? (
              previewUri ? (
                <MediaPreview
                  kind={mediaKind || (requiredKind === "video" ? "video" : "image")}
                  previewUri={previewUri}
                  fileName={fileLabel}
                  durationSec={durationSec}
                  onReplace={busy ? undefined : () => void pickMedia()}
                  onRemove={
                    busy
                      ? undefined
                      : () => {
                          void resetMedia(true);
                        }
                  }
                  disabled={busy}
                />
              ) : (
                <View
                  style={{
                    height: 180,
                    borderRadius: radius.md,
                    backgroundColor: colors.surfaceElevated,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: spacing.sm
                  }}
                >
                  <Ionicons
                    name={mediaKind === "video" ? "videocam-outline" : "image-outline"}
                    size={36}
                    color={colors.textMuted}
                  />
                  <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
                    {mediaKind === "video" ? "Video selected" : "Media selected"}
                  </Text>
                </View>
              )
            ) : null}
            {busy || uploadFailed ? (
              <UploadProgress
                progress={uploadProgress}
                failed={uploadFailed}
                label={
                  uploadFailed
                    ? "Media processing failed"
                    : uploadPhase === "Ready"
                      ? "Ready"
                      : uploadPhase || "Processing media…"
                }
              />
            ) : mediaFileId && uploadPhase === "Ready" ? (
              <Text style={[s.hint, { color: colors.success }]}>Ready</Text>
            ) : null}
            <PrimaryButton title={uploadButtonTitle()} onPress={() => void pickMedia()} disabled={busy} />
            {uploadFailed ? (
              <View style={{ marginTop: 10 }}>
                <PrimaryButton title="Retry" variant="outline" onPress={() => void pickMedia()} disabled={busy} />
              </View>
            ) : null}
            <View style={{ height: 12 }} />
            <PrimaryButton
              title="Next: campaign details"
              onPress={() => setStep(2)}
              disabled={!mediaFileId || busy}
            />
            {saveDraftButton}
            {!mediaFileId && !busy ? (
              <Text style={s.hint}>Upload media first. A preview appears as soon as you pick a file.</Text>
            ) : null}
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Text style={s.label}>Business and content</Text>
            <TextInput
              style={s.input}
              placeholder="Business name"
              placeholderTextColor={colors.textMuted}
              value={businessName}
              onChangeText={setBusinessName}
              maxLength={AD_BUSINESS_NAME_MAX}
            />
            <Text style={s.hint}>Category</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {(catalog?.businessCategories || [
                { code: "RETAIL", label: "Retail / Shop" },
                { code: "SERVICES", label: "Services" },
                { code: "OTHER", label: "Other" }
              ]).map((c) => (
                <Pressable
                  key={c.code}
                  onPress={() => setBusinessCategory(c.code)}
                  style={[s.chip, businessCategory === c.code && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                >
                  <Text style={{ color: businessCategory === c.code ? "#fff" : colors.text }}>{c.label}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={s.input}
              placeholder="Advertisement title"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
              maxLength={AD_TITLE_MAX}
              onFocus={() => scrollToY(0)}
            />
            <TextInput
              style={s.input}
              placeholder="Short description (shown on the card)"
              placeholderTextColor={colors.textMuted}
              value={shortDescription}
              onChangeText={setShortDescription}
              maxLength={AD_SHORT_DESCRIPTION_MAX}
            />
            <TextInput
              style={[s.input, { minHeight: 90, ...textFieldMultiline }]}
              placeholder="Detailed description"
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={AD_DESCRIPTION_MAX}
              onFocus={() => scrollToY(80)}
            />
            <Text
              style={[
                s.hint,
                {
                  marginBottom: spacing.sm,
                  color:
                    description.trim().length > AD_DESCRIPTION_MAX
                      ? colors.statusRejected
                      : colors.textMuted
                }
              ]}
            >
              {description.trim().length.toLocaleString()} / {AD_DESCRIPTION_MAX.toLocaleString()} characters
            </Text>
            <PrimaryButton
              title="Next: contact"
              onPress={() => void goToContact()}
              disabled={Boolean(campaignDetailsError())}
            />
            {saveDraftButton}
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Text style={s.label}>Contact, location and CTA</Text>
            <Text style={s.hint}>Primary action</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {(catalog?.ctaTypes || [
                { code: "CALL", label: "Call Now" },
                { code: "WHATSAPP", label: "WhatsApp" },
                { code: "WEBSITE", label: "Visit Website" },
                { code: "EMAIL", label: "Email" },
                { code: "DIRECTIONS", label: "Get Directions" }
              ]).map((c) => (
                <Pressable
                  key={c.code}
                  onPress={() => {
                    setCtaType(c.code);
                    setCtaLabel(c.label);
                  }}
                  style={[s.chip, ctaType === c.code && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                >
                  <Text style={{ color: ctaType === c.code ? "#fff" : colors.text }}>{c.label}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={s.input}
              placeholder="CTA button label"
              placeholderTextColor={colors.textMuted}
              value={ctaLabel}
              onChangeText={setCtaLabel}
              maxLength={AD_CTA_MAX}
            />
            <TextInput
              style={s.input}
              placeholder="Phone number"
              placeholderTextColor={colors.textMuted}
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
            />
            <TextInput
              style={s.input}
              placeholder="WhatsApp number"
              placeholderTextColor={colors.textMuted}
              value={whatsappNumber}
              onChangeText={setWhatsappNumber}
              keyboardType="phone-pad"
            />
            <TextInput
              style={s.input}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              value={contactEmail}
              onChangeText={setContactEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={s.input}
              placeholder="Website (https://…)"
              placeholderTextColor={colors.textMuted}
              value={destinationUrl}
              onChangeText={setDestinationUrl}
              autoCapitalize="none"
              keyboardType="default"
            />
            <TextInput
              style={s.input}
              placeholder="Address"
              placeholderTextColor={colors.textMuted}
              value={address}
              onChangeText={setAddress}
            />
            <TextInput
              style={s.input}
              placeholder="City"
              placeholderTextColor={colors.textMuted}
              value={city}
              onChangeText={setCity}
            />
            <TextInput
              style={s.input}
              placeholder="District"
              placeholderTextColor={colors.textMuted}
              value={district}
              onChangeText={setDistrict}
            />
            <TextInput
              style={s.input}
              placeholder="State"
              placeholderTextColor={colors.textMuted}
              value={stateName}
              onChangeText={setStateName}
            />
            <TextInput
              style={s.input}
              placeholder="Pincode"
              placeholderTextColor={colors.textMuted}
              value={pincode}
              onChangeText={setPincode}
              keyboardType="number-pad"
              maxLength={6}
            />
            <PrimaryButton
              title={liveEdit ? "Review changes" : "Next: duration"}
              onPress={() => void goToDuration()}
              disabled={Boolean(contactError())}
            />
            {saveDraftButton}
          </>
        ) : null}

        {step === 4 && !liveEdit ? (
          <>
            <Text style={s.label}>Duration and price</Text>
            <Text style={s.hint}>Price is calculated by the server from current admin pricing. You cannot set the amount.</Text>
            {pricingForType.length === 0 ? (
              <Text style={s.hint}>No durations are configured yet. Ask an admin to add pricing.</Text>
            ) : (
              pricingForType.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => void onQuote(p.id)}
                  disabled={busy}
                  style={[s.chip, pricingId === p.id && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                >
                  <Text style={{ color: pricingId === p.id ? "#fff" : colors.text }}>
                    {p.durationDays} days · ₹{p.priceInr.toLocaleString("en-IN")}
                  </Text>
                </Pressable>
              ))
            )}
            {busy && !quote ? <ActivityIndicator color={colors.primary} /> : null}
            {quote ? (
              <View style={{ marginVertical: 12 }}>
                <Text style={{ color: colors.text }}>
                  Subtotal {`₹${(quote.amountBeforeGstPaise / 100).toLocaleString("en-IN")}`}
                </Text>
                <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
                  GST {quote.gstPercent}% · ₹{(quote.gstAmountPaise / 100).toLocaleString("en-IN")}
                </Text>
                <Text style={{ color: colors.text, fontWeight: "700", marginTop: 6 }}>
                  Total ₹{quote.amountInr.toLocaleString("en-IN")} for {quote.durationDays} days
                </Text>
              </View>
            ) : null}
            <PrimaryButton
              title={!quote ? "Select a duration first" : "Review"}
              onPress={() => setStep(5)}
              disabled={!quote || busy}
              loading={busy && !quote}
            />
            {!quote ? (
              <Text style={[s.hint, { marginTop: spacing.sm }]}>
                Tap a duration above. The server calculates the price, then Review becomes available.
              </Text>
            ) : null}
            {saveDraftButton}
          </>
        ) : null}

        {step === 5 ? (
          <>
            <AdvertisementCard
              preview
              placement="home"
              ad={{
                id: adId || 0,
                title,
                description,
                shortDescription: shortDescription || null,
                ctaLabel,
                mediaUrl: previewUri || thumbnailUrl || mediaUrl,
                thumbnailUrl: previewUri || thumbnailUrl || mediaUrl,
                mediaKind: mediaKind || "image",
                typeCode,
                sponsoredLabel: "Advertisement",
                destinationUrl: normalizeAdvertisementUrl(destinationUrl),
                businessName,
                businessCategory,
                contactPhone: contactPhone || null,
                whatsappNumber: whatsappNumber || null,
                contactEmail: contactEmail || null,
                business: { name: businessName, category: businessCategory },
                contact: {
                  phone: contactPhone || null,
                  whatsapp: whatsappNumber || null,
                  email: contactEmail || null,
                  website: normalizeAdvertisementUrl(destinationUrl)
                },
                location:
                  address || city || district || stateName || pincode
                    ? {
                        address: address || null,
                        city: city || null,
                        district: district || null,
                        state: stateName || null,
                        pincode: pincode || null,
                        latitude: null,
                        longitude: null
                      }
                    : null,
                cta: { type: ctaType, label: ctaLabel, target: null }
              }}
            />
            <Text style={s.hint}>Type: {adTypeLabel(typeCode, selectedType?.label)}</Text>
            {liveEdit ? (
              <Text style={s.hint}>
                Submitting this edit takes the advertisement off the feed until an admin approves it. Paid dates do not restart.
              </Text>
            ) : (
              <>
                {quote ? (
                  <Text style={{ color: colors.text, marginBottom: 8 }}>
                    You pay ₹{quote.amountInr.toLocaleString("en-IN")} for {quote.durationDays} days
                    {quote.gstPercent ? ` (includes GST ${quote.gstPercent}%)` : ""}.
                  </Text>
                ) : null}
                <Text style={s.hint}>
                  After payment this campaign goes to admin review. Payment does not make the advertisement live.
                </Text>
              </>
            )}
            {busy ? (
              <ActivityIndicator color={colors.primary} />
            ) : liveEdit ? (
              <PrimaryButton title="Submit for review" onPress={() => void submitLiveEdit()} />
            ) : (
              <PrimaryButton title="Pay with Razorpay" onPress={() => void pay()} />
            )}
            {saveDraftButton}
          </>
        ) : null}
      </ScrollView>
    </AppKeyboardAvoidingView>
  );
}
