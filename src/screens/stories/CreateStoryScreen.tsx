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
import { useNavigation } from "@react-navigation/native";
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
import { VIDEO_MAX_BYTES, VIDEO_MIN_DURATION_SEC } from "../../config/media.config";
import { appAlert } from "../../context/AppAlertContext";
import { emitStoriesChanged } from "../../utils/storiesEvents";

const STORY_VIDEO_MAX_SEC = 30;
const STORY_CAPTION_MAX = 120;

type StoryPickKind = "image" | "video";

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
  const [kind, setKind] = useState<"image" | "video" | null>(null);
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [posting, setPosting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [caption, setCaption] = useState("");
  const [captionFocused, setCaptionFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const postingRef = useRef(false);

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

  const pick = useCallback(async (want: StoryPickKind) => {
    const permission = await ensureMediaLibraryRead({
      rationaleMessage: "Digital House needs photo library access to post a story."
    });
    if (!permission.ok) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      // Prefer modern MediaType arrays — MediaTypeOptions.Images still surfaces videos on Android.
      mediaTypes: want === "image" ? ["images"] : ["videos"],
      quality: 0.92,
      videoMaxDuration: STORY_VIDEO_MAX_SEC,
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
      appAlert("Videos only", "Please pick a video (30 seconds or less).");
      return;
    }
    if (isVideo) {
      const dur = asset.duration != null ? Number(asset.duration) / 1000 : null;
      if (dur != null && dur > STORY_VIDEO_MAX_SEC) {
        appAlert("Video too long", "Videos must be 30 seconds or less.");
        return;
      }
      if (dur != null && dur < VIDEO_MIN_DURATION_SEC) {
        appAlert("Video too short", `Videos must be at least ${VIDEO_MIN_DURATION_SEC} seconds.`);
        return;
      }
      if (asset.fileSize && asset.fileSize > VIDEO_MAX_BYTES) {
        appAlert("File too large", "Video must be 50 MB or less.");
        return;
      }
      setKind("video");
      setDurationSec(dur != null && Number.isFinite(dur) ? dur : null);
      setMimeType(asset.mimeType ?? "video/mp4");
      setFileSize(asset.fileSize ?? null);
    } else {
      setKind("image");
      setDurationSec(null);
      setMimeType(asset.mimeType ?? "image/jpeg");
      setFileSize(asset.fileSize ?? null);
    }
    setLocalUri(asset.uri);
  }, []);

  const post = useCallback(async () => {
    if (!localUri || !kind || postingRef.current) return;
    if (kind === "video") {
      const d = durationSec ?? 0;
      if (d > STORY_VIDEO_MAX_SEC) {
        appAlert("Video too long", "Videos must be 30 seconds or less.");
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
        const finalDuration = durationSec;
        if (finalDuration != null && finalDuration > STORY_VIDEO_MAX_SEC) {
          appAlert("Video too long", "Videos must be 30 seconds or less.");
          return;
        }
        await createStory({
          media_url: uploaded.key,
          media_type: "video",
          caption: caption.trim() || null,
          thumbnail_url: thumbnailKey,
          duration_seconds: finalDuration != null ? Math.ceil(finalDuration) : null,
          mime_type: uploaded.mime_type,
          file_size: uploaded.byte_size || fileSize
        });
        await optimized.cleanup?.();
      }
      emitStoriesChanged({ reason: "created" });
      navigation.goBack();
    } catch (e: any) {
      appAlert("Could not post", e?.response?.data?.message ?? e?.message ?? "Try again");
    } finally {
      postingRef.current = false;
      setPosting(false);
      setProgress(0);
    }
  }, [localUri, kind, durationSec, mimeType, fileSize, caption, navigation]);

  const compactPreview = captionFocused || keyboardHeight > 0;

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
          {!localUri ? (
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
              </Pressable>
              <Pressable
                style={[
                  styles.pickBtn,
                  { backgroundColor: colors.surface, borderColor: colors.border }
                ]}
                onPress={() => void pick("video")}
              >
                <Ionicons name="videocam-outline" size={28} color={colors.primary} />
                <Text style={{ color: colors.text, fontWeight: "700" }}>Video (≤30s)</Text>
              </Pressable>
            </View>
          ) : (
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
                  {durationSec.toFixed(1)}s
                </Text>
              ) : null}
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  setLocalUri(null);
                  setKind(null);
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
          )}
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
            disabled={!localUri || posting}
            onPress={() => void post()}
            style={[
              styles.postBtn,
              {
                backgroundColor: !localUri || posting ? colors.border : colors.primary,
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
  pickRow: { flexDirection: "row", gap: 12, marginTop: 24 },
  pickBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 28,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth
  },
  preview: { alignItems: "center", gap: 12 },
  media: { width: "100%", aspectRatio: 9 / 16, maxHeight: 420, borderRadius: 16 },
  mediaCompact: { maxHeight: 180, aspectRatio: 9 / 12 },
  meta: { fontSize: 13, fontWeight: "600" },
  change: { padding: 8 },
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
