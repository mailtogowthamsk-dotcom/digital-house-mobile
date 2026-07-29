/**
 * Direct upload to R2 via pre-signed PUT URL.
 * Images: optimize → upload → finalize (server WebP variants).
 * Videos: validate → compress (≤720p) → thumbnail → upload → finalize (H.264/AAC + posters).
 */

import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as VideoThumbnails from "expo-video-thumbnails";
import { getUploadUrl, finalizeMedia, deleteMediaUrls, type MediaModule } from "../api/media.api";
import { optimizeImageForUpload } from "./imageOptimizer";
import { optimizeVideoForUpload } from "./videoOptimizer";
import {
  IMAGE_UPLOAD_MAX_BYTES,
  IMAGE_PICKER_MAX_BYTES,
  VIDEO_MAX_BYTES,
  VIDEO_MAX_DURATION_SEC,
  VIDEO_MIN_DURATION_SEC,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  formatBytes,
  type VideoUploadStage
} from "../config/media.config";
import { cleanupTempVideoUri } from "../services/videoProcessing.service";

export { ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES };

export type MediaVariants = {
  thumb: string;
  medium: string;
  full: string;
};

export type UploadImageResult = {
  publicUrl: string;
  mediaFileId: number;
  variants: MediaVariants;
  width: number;
  height: number;
  byteSize: number;
  mimeType: string;
  mediaType: "image";
};

export type UploadVideoResult = {
  publicUrl: string;
  mediaFileId: number;
  thumbnailUri: string | null;
  thumbnailUrl: string | null;
  durationSec: number;
  byteSize: number;
  mimeType: string;
  fileName: string;
  mediaType: "video";
};

export type UploadVideoOptions = {
  mimeType?: string;
  durationSec?: number | null;
  fileName?: string | null;
  /** Cover frame on the (already trimmed) file, in milliseconds. */
  coverFrameMs?: number | null;
  /** Temp trimmed file to delete after upload attempt. */
  tempFileUri?: string | null;
  onProgress?: (progress: number) => void;
  onStage?: (stage: VideoUploadStage) => void;
};

export function isAllowedImageType(mime: string): boolean {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(mime.toLowerCase());
}

export function isAllowedVideoType(mime: string): boolean {
  const m = mime.toLowerCase();
  return m === "video/mp4" || m === "video/m4v" || m === "video/x-m4v";
}

export function validateImagePickerSize(bytes: number): void {
  if (bytes > IMAGE_PICKER_MAX_BYTES) {
    throw new Error(`Image must be ≤ ${formatBytes(IMAGE_PICKER_MAX_BYTES)}`);
  }
}

export function validateImageSize(bytes: number): void {
  if (bytes > IMAGE_UPLOAD_MAX_BYTES) {
    throw new Error(
      `Image must be ≤ ${Math.round(IMAGE_UPLOAD_MAX_BYTES / 1024)} KB after optimization`
    );
  }
}

export function validateVideoSize(bytes: number): void {
  if (bytes > VIDEO_MAX_BYTES) {
    throw new Error(`Video must be ≤ ${formatBytes(VIDEO_MAX_BYTES)}`);
  }
}

export function validateVideoDuration(seconds: number): void {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error("Could not read video duration. Please choose another clip.");
  }
  if (seconds < VIDEO_MIN_DURATION_SEC) {
    throw new Error("Video must be at least 3 seconds long.");
  }
  if (seconds > VIDEO_MAX_DURATION_SEC) {
    throw new Error("Video must be ≤ 1 minute. Trim your video to continue.");
  }
}

export function getMimeFromUri(uri: string, fallback = "image/jpeg"): string {
  const lower = uri.split("?")[0].toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".m4v")) return "video/x-m4v";
  if (lower.endsWith(".mov")) return "video/quicktime";
  return fallback;
}

export function isVideoAsset(
  mime: string | undefined,
  uri: string,
  assetType?: string | null
): boolean {
  if (assetType === "video") return true;
  if (mime && isAllowedVideoType(mime)) return true;
  if (mime?.startsWith("video/")) return true;
  return /\.(mp4|mov|m4v)(\?|$)/i.test(uri);
}

function normalizeVideoMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m === "video/mov") return "video/quicktime";
  if (m === "video/m4v") return "video/x-m4v";
  return m;
}

async function toUploadableUri(
  uri: string,
  contentType: string
): Promise<{ uri: string; cleanup?: () => Promise<void> }> {
  const isContentUri = uri.startsWith("content://");
  if (Platform.OS !== "android" || !isContentUri) {
    return { uri };
  }
  const ext = contentType.includes("video")
    ? contentType.includes("quicktime")
      ? ".mov"
      : ".mp4"
    : ".webp";
  const tempPath = `${FileSystem.cacheDirectory}upload_${Date.now()}${ext}`;
  await FileSystem.copyAsync({ from: uri, to: tempPath });
  return {
    uri: tempPath,
    cleanup: async () => {
      try {
        const info = await FileSystem.getInfoAsync(tempPath);
        if (info.exists) await FileSystem.deleteAsync(tempPath, { idempotent: true });
      } catch (_) {}
    }
  };
}

async function getLocalFileSize(uri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists || info.isDirectory) return 0;
  return typeof (info as { size?: number }).size === "number"
    ? (info as { size: number }).size
    : 0;
}

/**
 * Upload file from local URI to R2 via pre-signed PUT URL.
 */
export async function uploadToR2(
  uploadUrl: string,
  fileUri: string,
  contentType: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  const { uri: uploadUri, cleanup } = await toUploadableUri(fileUri, contentType);
  try {
    const result = await FileSystem.uploadAsync(uploadUrl, uploadUri, {
      httpMethod: "PUT",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { "Content-Type": contentType }
    });
    if (onProgress) onProgress(1);
    if (result.status < 200 || result.status >= 300) {
      throw new Error(`Upload failed: ${result.status}`);
    }
  } catch (e) {
    if (onProgress) onProgress(0);
    throw e instanceof Error ? e : new Error("Upload failed");
  } finally {
    if (cleanup) await cleanup();
  }
}

/**
 * Optimize locally, upload WebP to R2, then server finalize (variants + validation).
 */
export async function uploadOptimizedImage(
  localUri: string,
  module: MediaModule,
  onProgress?: (progress: number) => void
): Promise<UploadImageResult> {
  onProgress?.(0.05);
  const pickerSize = await getLocalFileSize(localUri);
  if (pickerSize > 0) validateImagePickerSize(pickerSize);

  const optimized = await optimizeImageForUpload(localUri);
  validateImageSize(optimized.size);

  const fileName = `img_${Date.now()}.webp`;
  onProgress?.(0.15);

  const { uploadUrl, mediaFileId } = await getUploadUrl({
    fileName,
    fileType: optimized.mime,
    fileSize: optimized.size,
    module,
    purpose: "image"
  });

  await uploadToR2(uploadUrl, optimized.uri, optimized.mime, (p) => {
    onProgress?.(0.15 + p * 0.65);
  });

  onProgress?.(0.85);
  const finalized = await finalizeMedia(mediaFileId);
  onProgress?.(1);

  return {
    publicUrl: finalized.publicUrl,
    mediaFileId,
    variants: finalized.variants,
    width: finalized.width,
    height: finalized.height,
    byteSize: finalized.byteSize,
    mimeType: "image/webp",
    mediaType: "image"
  };
}

export type GenerateVideoThumbnailResult = {
  uri: string;
  width: number;
  height: number;
};

/** Generate a local thumbnail for preview / optional upload. */
export async function generateVideoThumbnail(
  videoUri: string,
  timeMs = 500
): Promise<GenerateVideoThumbnailResult | null> {
  try {
    const result = await VideoThumbnails.getThumbnailAsync(videoUri, {
      time: timeMs,
      quality: 0.7
    });
    return { uri: result.uri, width: result.width, height: result.height };
  } catch {
    return null;
  }
}

/**
 * Validate, compress (≤720p), upload video to R2, then server finalize (H.264/AAC + posters).
 */
export async function uploadVideo(
  localUri: string,
  module: MediaModule,
  options: UploadVideoOptions = {}
): Promise<UploadVideoResult> {
  const onProgress = options.onProgress;
  const onStage = options.onStage;

  onStage?.("compressing");
  onProgress?.(0.02);

  const rawMime = (options.mimeType || getMimeFromUri(localUri, "video/mp4")).toLowerCase();
  // Accept picker MOV/M4V then re-encode to MP4 via compressor / server finalize.
  const pickerOk =
    isAllowedVideoType(rawMime) ||
    rawMime === "video/quicktime" ||
    rawMime === "video/mov" ||
    /\.(mp4|mov|m4v)(\?|$)/i.test(localUri);
  if (!pickerOk) {
    throw new Error("Only MP4 videos are supported for upload");
  }

  const durationSec = options.durationSec ?? 0;
  validateVideoDuration(durationSec);

  const optimized = await optimizeVideoForUpload(localUri, {
    onProgress: (p) => onProgress?.(0.02 + p * 0.35)
  });

  let thumbnailUrl: string | null = null;
  try {
    validateVideoSize(optimized.size);

    // Always upload as MP4 after client compress (or remux on server).
    const uploadMime = "video/mp4";
    const fileName =
      options.fileName?.trim()?.replace(/\.(mov|m4v)$/i, ".mp4") ||
      `vid_${Date.now()}.mp4`;

    onStage?.("processing");
    onProgress?.(0.4);
    const coverMs =
      options.coverFrameMs != null && options.coverFrameMs >= 0
        ? options.coverFrameMs
        : 500;
    const thumb = await generateVideoThumbnail(optimized.uri, coverMs);
    onProgress?.(0.45);

    if (thumb?.uri) {
      try {
        const optimizedThumb = await optimizeImageForUpload(thumb.uri);
        validateImageSize(optimizedThumb.size);
        const thumbPresign = await getUploadUrl({
          fileName: `vid_thumb_${Date.now()}.webp`,
          fileType: optimizedThumb.mime,
          fileSize: optimizedThumb.size,
          module,
          purpose: "video_thumbnail"
        });
        await uploadToR2(thumbPresign.uploadUrl, optimizedThumb.uri, optimizedThumb.mime);
        const finalizedThumb = await finalizeMedia(thumbPresign.mediaFileId);
        thumbnailUrl = finalizedThumb.variants?.medium || finalizedThumb.publicUrl;
      } catch {
        thumbnailUrl = null;
      }
    }

    onStage?.("uploading");
    onProgress?.(0.5);
    const { uploadUrl, mediaFileId } = await getUploadUrl({
      fileName,
      fileType: uploadMime,
      fileSize: optimized.size,
      module,
      purpose: "video"
    });

    await uploadToR2(uploadUrl, optimized.uri, uploadMime, (p) => {
      onProgress?.(0.5 + p * 0.3);
    });

    onStage?.("processing");
    onProgress?.(0.85);
    // Server: validate codecs, H.264/AAC faststart, Cache-Control, poster variants.
    const finalized = await finalizeMedia(mediaFileId);
    onStage?.("done");
    onProgress?.(1);

    await optimized.cleanup?.();
    // Success only — keep temp on failure so Create Post can retry the same trim.
    if (options.tempFileUri) {
      if (__DEV__) {
        console.log("[Upload] cleaning trimmed temp", {
          tempFileUri: options.tempFileUri,
          uploadUri: localUri
        });
      }
      await cleanupTempVideoUri(options.tempFileUri);
    }

    return {
      publicUrl: finalized.publicUrl,
      mediaFileId,
      thumbnailUri: thumb?.uri ?? null,
      thumbnailUrl: finalized.thumbnailUrl || thumbnailUrl,
      durationSec: Math.floor(finalized.durationSec ?? durationSec),
      byteSize: finalized.byteSize || optimized.size,
      mimeType: "video/mp4",
      fileName,
      mediaType: "video"
    };
  } catch (e) {
    if (thumbnailUrl) {
      void deleteMediaUrls([thumbnailUrl]).catch(() => undefined);
    }
    await optimized.cleanup?.();
    throw e;
  }
}
