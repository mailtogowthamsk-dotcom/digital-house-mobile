import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  StatusBar
} from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { PhotoCropEditor } from "../../components/media/preview/PhotoCropEditor";
import { PreviewVideoPlayer } from "../../components/media/preview/PreviewVideoPlayer";
import { pendingMediaDraft, type PendingMediaAsset } from "../../media/pendingMediaDraft";
import { assetFromPickerResult } from "../../media/pickerAsset";
import type { CropRatioId, ImageCropRect } from "../../media/cropTypes";
import { applyImageCrop } from "../../utils/imageCrop";
import { VIDEO_PICKER_MAX_DURATION_SEC } from "../../config/media.config";
import { appAlert } from "../../utils/appAlert";
import type { RootStackParamList } from "../../navigation/types";
import { needsRequiredTrim } from "../../services/videoProcessing.service";

async function resolveImageSize(
  uri: string,
  width?: number | null,
  height?: number | null
): Promise<{ width: number; height: number }> {
  if (width && height && width > 0 && height > 0) {
    return { width, height };
  }
  try {
    const meta = await ImageManipulator.manipulateAsync(uri, [], {
      compress: 1,
      format: ImageManipulator.SaveFormat.JPEG
    });
    return { width: meta.width, height: meta.height };
  } catch {
    return { width: width || 1080, height: height || 1080 };
  }
}

/**
 * Full-screen in-app media review before Create Post details / upload.
 * Upload does NOT happen here — only local review + optional photo crop.
 */
export function MediaPreviewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, "MediaPreview">>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [asset, setAsset] = useState<PendingMediaAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const cropRectRef = useRef<ImageCropRect | null>(null);
  const ratioIdRef = useRef<CropRatioId>("original");

  useLayoutEffect(() => {
    navigation.setOptions?.({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const draft = pendingMediaDraft.getAsset();
      if (!draft) {
        setBootError("No media selected. Go back and choose a photo or video.");
        return;
      }
      if (draft.kind === "image") {
        const size = await resolveImageSize(draft.uri, draft.width, draft.height);
        if (cancelled) return;
        const next = { ...draft, width: size.width, height: size.height };
        pendingMediaDraft.updateAsset(next);
        setAsset(next);
        return;
      }
      if (cancelled) return;
      setAsset(draft);
      // Long videos must be trimmed before Continue.
      if (
        draft.kind === "video" &&
        draft.durationSec != null &&
        needsRequiredTrim(draft.durationSec)
      ) {
        requestAnimationFrame(() => {
          navigation.navigate("VideoTrim");
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigation]);

  const onCropChange = useCallback((rect: ImageCropRect, ratioId: CropRatioId) => {
    cropRectRef.current = rect;
    ratioIdRef.current = ratioId;
  }, []);

  const handleClose = useCallback(() => {
    pendingMediaDraft.discard();
    navigation.goBack();
  }, [navigation]);

  const handleRemove = useCallback(() => {
    pendingMediaDraft.markRemoved();
    navigation.goBack();
  }, [navigation]);

  const pickReplacement = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      appAlert("Permission needed", "Allow access to photos and videos.");
      return;
    }
    const allowVideo = route.params?.allowVideo !== false;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: allowVideo ? ["images", "videos"] : ["images"],
      allowsEditing: false,
      quality: 0.95,
      videoMaxDuration: VIDEO_PICKER_MAX_DURATION_SEC
    });
    if (result.canceled || !result.assets?.[0]) return;
    const next = assetFromPickerResult(result.assets[0]);
    if (!next) return;
    if (next.kind === "image") {
      const size = await resolveImageSize(next.uri, next.width, next.height);
      next.width = size.width;
      next.height = size.height;
    }
    pendingMediaDraft.updateAsset(next);
    setAsset(next);
    cropRectRef.current = null;
    if (next.kind === "video" && next.durationSec != null && needsRequiredTrim(next.durationSec)) {
      navigation.navigate("VideoTrim");
    }
  }, [navigation, route.params?.allowVideo]);

  const handleContinue = useCallback(async () => {
    if (!asset || busy) return;
    if (asset.kind === "video") {
      if (!(asset.durationSec != null && asset.durationSec > 0)) {
        appAlert(
          "Could not read video duration",
          "Please choose another clip or replace this video."
        );
        return;
      }
      if (needsRequiredTrim(asset.durationSec)) {
        appAlert("This video is longer than 1 minute.", "Trim your video to continue.");
        navigation.navigate("VideoTrim");
        return;
      }
      pendingMediaDraft.updateAsset(asset);
      pendingMediaDraft.confirm(asset);
      navigation.goBack();
      return;
    }
    setBusy(true);
    try {
      let finalAsset = asset;
      if (asset.kind === "image" && cropRectRef.current && asset.width && asset.height) {
        const cropped = await applyImageCrop(
          asset.uri,
          cropRectRef.current,
          asset.width,
          asset.height
        );
        finalAsset = {
          ...asset,
          uri: cropped.uri,
          width: cropped.width,
          height: cropped.height,
          mimeType: cropped.uri === asset.uri ? asset.mimeType : "image/jpeg",
          fileName:
            cropped.uri === asset.uri
              ? asset.fileName
              : asset.fileName.replace(/\.\w+$/, "") + ".jpg"
        };
      }
      pendingMediaDraft.confirm(finalAsset);
      navigation.goBack();
    } catch (e) {
      appAlert(
        "Could not prepare media",
        e instanceof Error ? e.message : "Please try another file."
      );
    } finally {
      setBusy(false);
    }
  }, [asset, busy, navigation]);

  if (bootError) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: "#0B1220" }]}>
        <Text style={styles.errorText}>{bootError}</Text>
        <Pressable style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryBtnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (!asset) {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: "#0B1220" }]}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: "#0B1220" }]}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={handleClose} hitSlop={10} style={styles.headerBtn}>
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>
          {asset.kind === "video" ? "Preview video" : "Preview photo"}
        </Text>
        <View style={styles.headerBtn} />
      </View>

      <View style={styles.body}>
        {asset.kind === "image" && asset.width && asset.height ? (
          <PhotoCropEditor
            uri={asset.uri}
            imageWidth={asset.width}
            imageHeight={asset.height}
            onCropChange={onCropChange}
            accentColor={colors.primary}
            textColor="#F8FAFC"
            mutedColor="#94A3B8"
            surfaceColor="rgba(255,255,255,0.08)"
          />
        ) : asset.kind === "video" ? (
          <PreviewVideoPlayer
            uri={asset.uri}
            durationSec={asset.durationSec}
            width={asset.width}
            height={asset.height}
            fileSize={asset.fileSize}
            accentColor={colors.primary}
            textColor="#F8FAFC"
            mutedColor="#94A3B8"
            surfaceColor="rgba(255,255,255,0.08)"
          />
        ) : (
          <View style={styles.center}>
            <ActivityIndicator color="#fff" />
          </View>
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <View style={styles.footerRow}>
          <Pressable style={styles.ghostBtn} onPress={() => void pickReplacement()} disabled={busy}>
            <Ionicons name="swap-horizontal" size={18} color="#fff" />
            <Text style={styles.ghostBtnText}>Replace</Text>
          </Pressable>
          {asset.kind === "video" ? (
            <Pressable
              style={styles.ghostBtn}
              onPress={() => {
                pendingMediaDraft.updateAsset(asset);
                navigation.navigate("VideoTrim");
              }}
              disabled={busy}
            >
              <Ionicons name="cut-outline" size={18} color="#fff" />
              <Text style={styles.ghostBtnText}>Trim</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.ghostBtn} onPress={handleRemove} disabled={busy}>
            <Ionicons name="trash-outline" size={18} color="#FCA5A5" />
            <Text style={[styles.ghostBtnText, { color: "#FCA5A5" }]}>Remove</Text>
          </Pressable>
        </View>
        <Pressable
          style={[styles.continueBtn, { backgroundColor: colors.primary, opacity: busy ? 0.7 : 1 }]}
          onPress={() => void handleContinue()}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.continueText}>
              {asset.kind === "video" &&
              asset.durationSec != null &&
              needsRequiredTrim(asset.durationSec)
                ? "Trim to continue"
                : "Continue"}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm
  },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#fff",
    fontSize: 17,
    fontWeight: "700"
  },
  body: { flex: 1 },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)"
  },
  footerRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  ghostBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  ghostBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  continueBtn: {
    height: 52,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center"
  },
  continueText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  errorText: {
    color: "#F8FAFC",
    textAlign: "center",
    marginHorizontal: spacing.xl,
    marginTop: spacing.xxxl,
    lineHeight: 22
  },
  secondaryBtn: {
    alignSelf: "center",
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.12)"
  },
  secondaryBtnText: { color: "#fff", fontWeight: "700" }
});
