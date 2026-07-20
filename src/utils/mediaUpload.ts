/**
 * Direct upload to R2 via pre-signed PUT URL.
 * Images: optimize → upload → finalize (server variants).
 * Videos: validate → upload (no finalize).
 */

import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as VideoThumbnails from "expo-video-thumbnails";
import { getUploadUrl, finalizeMedia, type MediaModule } from "../api/media.api";
import { optimizeImageForUpload } from "./imageOptimizer";
import {
  IMAGE_UPLOAD_MAX_BYTES,
  IMAGE_PICKER_MAX_BYTES,
  VIDEO_MAX_BYTES,
  VIDEO_MAX_DURATION_SEC,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  formatBytes
} from "../config/media.config";

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

export function isAllowedImageType(mime: string): boolean {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(mime.toLowerCase());
}

export function isAllowedVideoType(mime: string): boolean {
  const m = mime.toLowerCase();
  return (ALLOWED_VIDEO_TYPES as readonly string[]).includes(m) || m === "video/mov";
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
  if (seconds > VIDEO_MAX_DURATION_SEC) {
    throw new Error(`Video must be ≤ ${VIDEO_MAX_DURATION_SEC} seconds`);
  }
  if (seconds <= 0) {
    throw new Error("Could not read video duration");
  }
}

export function getMimeFromUri(uri: string, fallback = "image/jpeg"): string {
  const lower = uri.split("?")[0].toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".mov")) return "video/quicktime";
  return fallback;
}

export function isVideoAsset(mime: string | undefined, uri: string): boolean {
  if (mime && isAllowedVideoType(mime)) return true;
  if (mime?.startsWith("video/")) return true;
  return /\.(mp4|mov)(\?|$)/i.test(uri);
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
    module
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
 * Validate and upload a video to R2. Optionally uploads a JPEG thumbnail.
 * Does not call finalize (videos are ready after PUT).
 */
export async function uploadVideo(
  localUri: string,
  module: MediaModule,
  options: {
    mimeType?: string;
    durationSec?: number | null;
    fileName?: string | null;
    onProgress?: (progress: number) => void;
  } = {}
): Promise<UploadVideoResult> {
  const onProgress = options.onProgress;
  onProgress?.(0.05);

  const mime = (options.mimeType || getMimeFromUri(localUri, "video/mp4")).toLowerCase();
  if (!isAllowedVideoType(mime)) {
    throw new Error("Only MP4 or MOV videos are allowed");
  }

  const durationSec = options.durationSec ?? 0;
  if (durationSec > 0) validateVideoDuration(durationSec);

  const byteSize = await getLocalFileSize(localUri);
  if (byteSize <= 0) throw new Error("Could not read video file size");
  validateVideoSize(byteSize);

  const ext = mime.includes("quicktime") || localUri.toLowerCase().includes(".mov") ? "mov" : "mp4";
  const fileName = options.fileName?.trim() || `vid_${Date.now()}.${ext}`;

  onProgress?.(0.12);
  const thumb = await generateVideoThumbnail(localUri);
  onProgress?.(0.2);

  let thumbnailUrl: string | null = null;
  if (thumb?.uri) {
    try {
      const optimizedThumb = await optimizeImageForUpload(thumb.uri);
      validateImageSize(optimizedThumb.size);
      const thumbPresign = await getUploadUrl({
        fileName: `vid_thumb_${Date.now()}.webp`,
        fileType: optimizedThumb.mime,
        fileSize: optimizedThumb.size,
        module
      });
      await uploadToR2(thumbPresign.uploadUrl, optimizedThumb.uri, optimizedThumb.mime);
      const finalized = await finalizeMedia(thumbPresign.mediaFileId);
      thumbnailUrl = finalized.publicUrl;
    } catch {
      thumbnailUrl = null;
    }
  }

  onProgress?.(0.4);
  const { uploadUrl, publicUrl, mediaFileId } = await getUploadUrl({
    fileName,
    fileType: mime === "video/mov" ? "video/quicktime" : mime,
    fileSize: byteSize,
    module
  });

  await uploadToR2(uploadUrl, localUri, mime === "video/mov" ? "video/quicktime" : mime, (p) => {
    onProgress?.(0.4 + p * 0.55);
  });
  onProgress?.(1);

  return {
    publicUrl,
    mediaFileId,
    thumbnailUri: thumb?.uri ?? null,
    thumbnailUrl,
    durationSec: Math.floor(durationSec),
    byteSize,
    mimeType: mime === "video/mov" ? "video/quicktime" : mime,
    fileName,
    mediaType: "video"
  };
}
