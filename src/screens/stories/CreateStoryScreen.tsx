import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  type NativeSyntheticEvent,
  type TextInputFocusEventData
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useVideoPlayer, VideoView } from "expo-video";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { HeaderBackButton } from "../../components/ui/HeaderBackButton";
import {
  generateVideoThumbnail,
  validateImageSize,
  validateVideoSize
} from "../../utils/mediaUpload";
import { createStory, uploadStoryMediaToServer } from "../../api/stories.api";
import { optimizeImageForUpload } from "../../utils/imageOptimizer";
import { optimizeVideoForUpload } from "../../utils/videoOptimizer";
import { ensureMediaLibraryRead } from "../../permissions";
import { VIDEO_MAX_BYTES, formatDuration } from "../../config/media.config";
import {
  STORY_CAPTION_MAX_LENGTH,
  STORY_VIDEO_MAX_DURATION_SEC,
  STORY_VIDEO_MIN_DURATION_SEC,
  STORY_VIDEO_PICKER_MAX_DURATION_SEC
} from "../../config/stories.constants";
import { appAlert } from "../../context/AppAlertContext";
import { emitStoriesChanged } from "../../utils/storiesEvents";
import { probeLocalVideoDurationSec } from "../../utils/probeLocalVideoDuration";
import { pendingMediaDraft } from "../../media/pendingMediaDraft";
import { cleanupTempVideoUri } from "../../services/videoProcessing.service";

const STORY_CAPTION_MAX = STORY_CAPTION_MAX_LENGTH;
const MAX_LABEL = `${Math.floor(STORY_VIDEO_MAX_DURATION_SEC / 60)} min`;

type StoryPickKind = "image" | "video" | "text";

const TEXT_BG_PRESETS = ["#0F172A", "#7C2D12", "#1E3A5F", "#14532D", "#4C1D95", "#9F1239"] as const;

function LocalVideoPreview({ uri, compact }: { uri: string; compact?: boolean }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = false;
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={[styles.media, compact && styles.mediaCompact]}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

export function CreateStoryScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [kind, setKind] = useState<"image" | "video" | "text" | null>(null);
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [textBg, setTextBg] = useState<string>(TEXT_BG_PRESETS[0]);
  const [posting, setPosting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [caption, setCaption] = useState("");
  const [captionFocused, setCaptionFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const postingRef = useRef(false);
  const tempTrimUriRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      const uri = tempTrimUriRef.current;
      tempTrimUriRef.current = null;
      if (uri) void cleanupTempVideoUri(uri);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      const outcome = pendingMediaDraft.consumeResult();
      if (!outcome || outcome.result !== "confirmed" || !outcome.asset) return;
      const asset = outcome.asset;
      if (asset.kind === "image") {
        setKind("image");
        setLocalUri(asset.uri);
        setDurationSec(null);
        setMimeType(asset.mimeType || "image/jpeg");
        setFileSize(asset.fileSize ?? null);
        return;
      }
      if (asset.kind !== "video") return;
      if (tempTrimUriRef.current && tempTrimUriRef.current !== asset.uri) {
        void cleanupTempVideoUri(tempTrimUriRef.current);
      }
      tempTrimUriRef.current = asset.tempFileUri ?? asset.uri;
      setKind("video");
      setLocalUri(asset.uri);
      setDurationSec(asset.durationSec);
      setMimeType(asset.mimeType || "video/mp4");
      setFileSize(asset.fileSize ?? null);
    }, [])
  );

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = Keyboard.addListener(showEvt, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const onHide = Keyboard.addListener(hideEvt, () => {
      setKeyboardHeight(0);
      setCaptionFocused(false);
    });
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  const scrollCaptionIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, Platform.OS === "ios" ? 80 : 120);
    });
  }, []);

  useEffect(() => {
    if (captionFocused && keyboardHeight > 0) {
      scrollCaptionIntoView();
    }
  }, [captionFocused, keyboardHeight, scrollCaptionIntoView]);

  const onCaptionFocus = useCallback(
    (_e: NativeSyntheticEvent<TextInputFocusEventData>) => {
      setCaptionFocused(true);
      scrollCaptionIntoView();
    },
    [scrollCaptionIntoView]
  );

  const openPhotoCrop = useCallback(
    async (uri: string, mime: string, size: number | null, fileName?: string, width?: number | null, height?: number | null) => {
      pendingMediaDraft.open(
        {
          uri,
          kind: "image",
          mimeType: mime || "image/jpeg",
          fileName: fileName || uri.split("/").pop() || "story.jpg",
          fileSize: size,
          width: width ?? null,
          height: height ?? null,
          durationSec: null
        },
        localUri ? "replace" : "create"
      );
      navigation.navigate("MediaPreview", {
        allowVideo: false,
        defaultCropRatio: "9:16",
        mode: localUri ? "replace" : "create"
      });
    },
    [navigation, localUri]
  );

  const openTrim = useCallback(
    (uri: string, duration: number, mime: string, size: number | null, fileName?: string) => {
      pendingMediaDraft.open(
        {
          uri,
          kind: "video",
          mimeType: mime || "video/mp4",
          fileName: fileName || uri.split("/").pop() || "story.mp4",
          fileSize: size,
          width: null,
          height: null,
          durationSec: duration
        },
        "create"
      );
      navigation.navigate("VideoTrim");
    },
    [navigation]
  );

  const pick = useCallback(async (want: StoryPickKind) => {
    if (want === "text") {
      setKind("text");
      setLocalUri(null);
      setDurationSec(null);
      setMimeType("text/plain");
      setFileSize(null);
      setCaption("");
      return;
    }
    const permission = await ensureMediaLibraryRead({
      rationaleMessage: "Digital House needs photo library access to post a story."
    });
    if (!permission.ok) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: want === "image" ? ["images"] : ["videos"],
      quality: 0.92,
      // Allow longer gallery picks; trim screen enforces the 1-minute story max.
      videoMaxDuration: STORY_VIDEO_PICKER_MAX_DURATION_SEC,
      allowsEditing: false
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const isVideo =
      (asset.type ?? "").includes("video") ||
      /\.(mp4|mov|m4v|webm|mkv)$/i.test(asset.uri) ||
      (asset.mimeType ?? "").startsWith("video/");
    if (want === "image" && isVideo) {
      appAlert("Photos only", "Please pick an image. Use Video for clips.");
      return;
    }
    if (want === "video" && !isVideo) {
      appAlert("Videos only", `Please pick a video (up to ${MAX_LABEL} after trim).`);
      return;
    }
    if (!isVideo) {
      await openPhotoCrop(
        asset.uri,
        asset.mimeType ?? "image/jpeg",
        asset.fileSize ?? null,
        asset.fileName ?? undefined,
        asset.width ?? null,
        asset.height ?? null
      );
      return;
    }
    let dur = asset.duration != null ? Number(asset.duration) / 1000 : null;
    if (dur == null || !Number.isFinite(dur) || dur <= 0) {
      dur = await probeLocalVideoDurationSec(asset.uri);
    }
    if (dur == null || !Number.isFinite(dur) || dur <= 0) {
      appAlert(
        "Could not read video",
        "We could not determine this video’s length. Try another clip."
      );
      return;
    }
    if (dur < STORY_VIDEO_MIN_DURATION_SEC) {
      appAlert(
        "Video too short",
        `Videos must be at least ${STORY_VIDEO_MIN_DURATION_SEC} seconds.`
      );
      return;
    }
    if (dur > STORY_VIDEO_PICKER_MAX_DURATION_SEC) {
      appAlert(
        "Video too long",
        `Please choose a video under ${Math.floor(STORY_VIDEO_PICKER_MAX_DURATION_SEC / 60)} minutes.`
      );
      return;
    }
    if (asset.fileSize && asset.fileSize > VIDEO_MAX_BYTES * 4) {
      appAlert("File too large", "Video is too large to process. Try a shorter clip.");
      return;
    }
    const mime = asset.mimeType ?? "video/mp4";
    // Longer than 1 minute → trim required before story create.
    if (dur > STORY_VIDEO_MAX_DURATION_SEC) {
      openTrim(asset.uri, dur, mime, asset.fileSize ?? null, asset.fileName ?? undefined);
      return;
    }
    setKind("video");
    setDurationSec(dur);
    setMimeType(mime);
    setFileSize(asset.fileSize ?? null);
    setLocalUri(asset.uri);
  }, [openTrim, openPhotoCrop]);

  const post = useCallback(async () => {
    if ((!localUri && kind !== "text") || !kind || postingRef.current) return;
    if (kind === "text") {
      const body = caption.trim().replace(/\s+/g, " ");
      if (!body) {
        appAlert("Add text", "Type something for your text story.");
        return;
      }
      Keyboard.dismiss();
      postingRef.current = true;
      setPosting(true);
      try {
        await createStory({
          media_type: "text",
          caption: body,
          mime_type: "text/plain"
        });
        emitStoriesChanged({ reason: "created" });
        navigation.goBack();
      } catch (e: any) {
        appAlert(
          "Could not post",
          e?.response?.data?.message ?? e?.message ?? "Try again"
        );
      } finally {
        postingRef.current = false;
        setPosting(false);
        setProgress(0);
      }
      return;
    }
    if (!localUri) return;
    if (kind === "video") {
      let d = durationSec;
      if (d == null || !Number.isFinite(d) || d <= 0) {
        d = await probeLocalVideoDurationSec(localUri);
        if (d != null) setDurationSec(d);
      }
      if (d == null || !Number.isFinite(d) || d <= 0) {
        appAlert(
          "Could not read video",
          "We could not determine this video’s length. Try another clip."
        );
        return;
      }
      if (d < STORY_VIDEO_MIN_DURATION_SEC) {
        appAlert(
          "Video too short",
          `Videos must be at least ${STORY_VIDEO_MIN_DURATION_SEC} seconds.`
        );
        return;
      }
      if (d > STORY_VIDEO_MAX_DURATION_SEC) {
        appAlert(
          "Trim required",
          `Stories can be up to ${MAX_LABEL}. Trim your video to continue.`
        );
        openTrim(localUri, d, mimeType || "video/mp4", fileSize);
        return;
      }
    }
    Keyboard.dismiss();
    postingRef.current = true;
    setPosting(true);
    setProgress(0);
    try {
      if (kind === "image") {
        setProgress(0.05);
        const optimized = await optimizeImageForUpload(localUri);
        validateImageSize(optimized.size);
        setProgress(0.2);
        const uploaded = await uploadStoryMediaToServer(optimized.uri, optimized.mime, (p) =>
          setProgress(0.2 + p * 0.7)
        );
        await createStory({
          media_url: uploaded.key,
          media_type: "image",
          caption: caption.trim() || null,
          mime_type: uploaded.mime_type,
          file_size: uploaded.byte_size || fileSize
        });
      } else {
        setProgress(0.05);
        const optimized = await optimizeVideoForUpload(localUri, {
          onProgress: (p) => setProgress(0.05 + p * 0.35)
        });
        validateVideoSize(optimized.size);
        let thumbnailKey: string | null = null;
        try {
          const thumb = await generateVideoThumbnail(optimized.uri, 500);
          if (thumb?.uri) {
            const optimizedThumb = await optimizeImageForUpload(thumb.uri);
            validateImageSize(optimizedThumb.size);
            const thumbUp = await uploadStoryMediaToServer(
              optimizedThumb.uri,
              optimizedThumb.mime
            );
            thumbnailKey = thumbUp.key;
          }
        } catch {
          thumbnailKey = null;
        }
        setProgress(0.5);
        const uploaded = await uploadStoryMediaToServer(optimized.uri, "video/mp4", (p) =>
          setProgress(0.5 + p * 0.4)
        );
        const serverDuration =
          uploaded.duration_seconds != null && Number.isFinite(uploaded.duration_seconds)
            ? Number(uploaded.duration_seconds)
            : null;
        let finalDuration = serverDuration ?? durationSec;
        if (finalDuration == null || !Number.isFinite(finalDuration)) {
          finalDuration = await probeLocalVideoDurationSec(optimized.uri);
        }
        if (finalDuration == null || !Number.isFinite(finalDuration)) {
          appAlert(
            "Could not read video",
            "We could not determine this video’s length after processing."
          );
          return;
        }
        if (finalDuration > STORY_VIDEO_MAX_DURATION_SEC) {
          appAlert(
            "Video too long",
            `Stories must be ${STORY_VIDEO_MAX_DURATION_SEC} seconds or less. Trim and try again.`
          );
          return;
        }
        if (finalDuration < STORY_VIDEO_MIN_DURATION_SEC) {
          appAlert(
            "Video too short",
            `Videos must be at least ${STORY_VIDEO_MIN_DURATION_SEC} seconds.`
          );
          return;
        }
        await createStory({
          media_url: uploaded.key,
          media_type: "video",
          caption: caption.trim() || null,
          thumbnail_url: thumbnailKey,
          duration_seconds: Math.ceil(finalDuration),
          mime_type: uploaded.mime_type,
          file_size: uploaded.byte_size || fileSize
        });
        await optimized.cleanup?.();
        if (tempTrimUriRef.current) {
          const t = tempTrimUriRef.current;
          tempTrimUriRef.current = null;
          await cleanupTempVideoUri(t);
        }
      }
      emitStoriesChanged({ reason: "created" });
      navigation.goBack();
    } catch (e: any) {
      const raw = e?.response?.data?.message ?? e?.message ?? "Try again";
      const msg = String(raw);
      let title = "Could not post";
      let body = msg;
      if (/too long|VIDEO_TOO_LONG|Trim/i.test(msg)) {
        title = "Video too long";
        body = `Stories must be ${STORY_VIDEO_MAX_DURATION_SEC} seconds or less. Trim your clip and try again.`;
      } else if (/too short|VIDEO_TOO_SHORT/i.test(msg)) {
        title = "Video too short";
        body = `Videos must be at least ${STORY_VIDEO_MIN_DURATION_SEC} seconds.`;
      } else if (/corrupt|INVALID_VIDEO|UNSUPPORTED|MIME/i.test(msg)) {
        title = "Unsupported media";
        body = "This file could not be used as a story. Try another photo or video.";
      } else if (/upload/i.test(msg)) {
        title = "Upload failed";
        body = "Could not upload your story media. Check your connection and try again.";
      }
      appAlert(title, body);
    } finally {
      postingRef.current = false;
      setPosting(false);
      setProgress(0);
    }
  }, [localUri, kind, durationSec, mimeType, fileSize, caption, navigation, openTrim]);

  const compactPreview = captionFocused || keyboardHeight > 0;
  const canPost =
    kind === "text" ? caption.trim().length > 0 : Boolean(localUri && kind);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <View style={[styles.top, { borderBottomColor: colors.border }]}>
          <HeaderBackButton onPress={() => navigation.goBack()} />
          <Text style={[styles.title, { color: colors.text }]}>Add Story</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.body,
            {
              paddingBottom:
                24 +
                (keyboardHeight > 0
                  ? 120
                  : Math.max(insets.bottom, 12) + 72)
            }
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          {!localUri && kind !== "text" ? (
            <View style={styles.pickRow}>
              <Pressable
                style={[
                  styles.pickBtn,
                  { backgroundColor: colors.surface, borderColor: colors.border }
                ]}
                onPress={() => void pick("image")}
              >
                <Ionicons name="image-outline" size={28} color={colors.primary} />
                <Text style={{ color: colors.text, fontWeight: "700" }}>Photo</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>Crop 9:16</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.pickBtn,
                  { backgroundColor: colors.surface, borderColor: colors.border }
                ]}
                onPress={() => void pick("video")}
              >
                <Ionicons name="videocam-outline" size={28} color={colors.primary} />
                <Text style={{ color: colors.text, fontWeight: "700" }}>Video (≤{MAX_LABEL})</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.pickBtn,
                  { backgroundColor: colors.surface, borderColor: colors.border }
                ]}
                onPress={() => void pick("text")}
              >
                <Ionicons name="text-outline" size={28} color={colors.primary} />
                <Text style={{ color: colors.text, fontWeight: "700" }}>Text</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>Type a status</Text>
              </Pressable>
            </View>
          ) : kind === "text" ? (
            <View style={styles.textComposer}>
              <View style={[styles.textPreview, { backgroundColor: textBg }]}>
                <TextInput
                  value={caption}
                  onChangeText={(t) => setCaption(t.slice(0, STORY_CAPTION_MAX))}
                  placeholder="Type your story…"
                  placeholderTextColor="rgba(255,255,255,0.55)"
                  style={styles.textStoryInput}
                  maxLength={STORY_CAPTION_MAX}
                  multiline
                  textAlign="center"
                  textAlignVertical="center"
                  autoFocus
                />
              </View>
              <View style={styles.bgRow}>
                {TEXT_BG_PRESETS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setTextBg(c)}
                    style={[
                      styles.bgDot,
                      {
                        backgroundColor: c,
                        borderColor: textBg === c ? colors.primary : "transparent",
                        borderWidth: textBg === c ? 3 : 0
                      }
                    ]}
                  />
                ))}
              </View>
              <Text style={[styles.textCount, { color: colors.textMuted }]}>
                {caption.length}/{STORY_CAPTION_MAX}
              </Text>
              <Pressable
                onPress={() => {
                  setKind(null);
                  setCaption("");
                }}
                style={styles.change}
              >
                <Text style={{ color: colors.primary, fontWeight: "700" }}>Choose different</Text>
              </Pressable>
            </View>
          ) : localUri ? (
            <View style={styles.preview}>
              {kind === "video" ? (
                <LocalVideoPreview uri={localUri} compact={compactPreview} />
              ) : (
                <Image
                  source={{ uri: localUri }}
                  style={[styles.media, compactPreview && styles.mediaCompact]}
                  resizeMode="cover"
                />
              )}
              {kind === "video" && durationSec != null ? (
                <Text style={[styles.meta, { color: colors.textSecondary }]}>
                  {formatDuration(durationSec)}
                  {durationSec > STORY_VIDEO_MAX_DURATION_SEC ? " · trim required" : ""}
                </Text>
              ) : null}
              {kind === "video" && localUri && durationSec != null ? (
                <Pressable
                  onPress={() =>
                    openTrim(localUri, durationSec, mimeType || "video/mp4", fileSize)
                  }
                  style={[
                    styles.trimBtn,
                    { borderColor: colors.border, backgroundColor: colors.surface }
                  ]}
                >
                  <Ionicons name="cut-outline" size={18} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontWeight: "700" }}>Trim video</Text>
                </Pressable>
              ) : null}
              {kind === "image" && localUri ? (
                <Pressable
                  onPress={() =>
                    void openPhotoCrop(localUri, mimeType || "image/jpeg", fileSize)
                  }
                  style={[
                    styles.trimBtn,
                    { borderColor: colors.border, backgroundColor: colors.surface }
                  ]}
                >
                  <Ionicons name="crop-outline" size={18} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontWeight: "700" }}>Crop photo</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  if (tempTrimUriRef.current) {
                    void cleanupTempVideoUri(tempTrimUriRef.current);
                    tempTrimUriRef.current = null;
                  }
                  setLocalUri(null);
                  setKind(null);
                  setDurationSec(null);
                  setCaption("");
                }}
                style={styles.change}
              >
                <Text style={{ color: colors.primary, fontWeight: "700" }}>Choose different</Text>
              </Pressable>
              <TextInput
                value={caption}
                onChangeText={(t) => setCaption(t.slice(0, STORY_CAPTION_MAX))}
                placeholder="Add a caption…"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.captionInput,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: colors.surface
                  }
                ]}
                maxLength={STORY_CAPTION_MAX}
                multiline
                onFocus={onCaptionFocus}
                onBlur={() => setCaptionFocused(false)}
                textAlignVertical="top"
              />
              <Text style={{ color: colors.textMuted, fontSize: 11, alignSelf: "flex-end" }}>
                {caption.length}/{STORY_CAPTION_MAX}
              </Text>
            </View>
          ) : null}
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, 12),
              borderTopColor: colors.border,
              backgroundColor: colors.background
            }
          ]}
        >
          <Pressable
            disabled={!canPost || posting}
            onPress={() => void post()}
            style={[
              styles.postBtn,
              {
                backgroundColor: !canPost || posting ? colors.border : colors.primary,
                opacity: posting ? 0.85 : 1
              }
            ]}
          >
            {posting ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.postText}>
                  Posting{progress > 0 ? ` ${Math.round(progress * 100)}%` : "…"}
                </Text>
              </View>
            ) : (
              <Text style={styles.postText}>Post Story</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  top: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  title: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700" },
  body: { padding: 16, gap: 16, flexGrow: 1 },
  pickRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 24 },
  pickBtn: {
    flexGrow: 1,
    flexBasis: "30%",
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 22,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth
  },
  textComposer: {
    width: "100%",
    alignItems: "center",
    gap: 14,
    paddingTop: 8
  },
  textPreview: {
    width: "100%",
    maxWidth: 280,
    aspectRatio: 9 / 16,
    maxHeight: 420,
    alignSelf: "center",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 28,
    overflow: "hidden"
  },
  textStoryInput: {
    width: "100%",
    color: "#fff",
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 34,
    minHeight: 140,
    textAlign: "center",
    paddingHorizontal: 4
  },
  bgRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    alignItems: "center",
    width: "100%"
  },
  bgDot: { width: 32, height: 32, borderRadius: 16 },
  textCount: {
    fontSize: 11,
    alignSelf: "center",
    width: "100%",
    maxWidth: 280,
    textAlign: "right"
  },
  preview: { alignItems: "center", gap: 12 },
  media: { width: "100%", aspectRatio: 9 / 16, maxHeight: 420, borderRadius: 16 },
  mediaCompact: { maxHeight: 180, aspectRatio: 9 / 12 },
  meta: { fontSize: 13, fontWeight: "600" },
  trimBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth
  },
  change: { padding: 8, alignSelf: "center" },
  captionInput: {
    width: "100%",
    minHeight: 72,
    maxHeight: 120,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginTop: 8
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth
  },
  postBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center"
  },
  postText: { color: "#fff", fontWeight: "800", fontSize: 15 }
});
