/**
 * Direct upload to R2 via pre-signed PUT URL + server-side finalize for images.
 */

import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { getUploadUrl, finalizeMedia, type MediaModule } from "../api/media.api";
import { optimizeImageForUpload } from "./imageOptimizer";
import { IMAGE_UPLOAD_MAX_BYTES } from "../config/image.config";

const VIDEO_MAX_BYTES = 15 * 1024 * 1024;
const VIDEO_MAX_DURATION_SEC = 30;

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
export const ALLOWED_VIDEO_TYPES = ["video/mp4"];

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
};

export function isAllowedImageType(mime: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(mime.toLowerCase());
}

export function isAllowedVideoType(mime: string): boolean {
  return ALLOWED_VIDEO_TYPES.includes(mime.toLowerCase());
}

export function validateImageSize(bytes: number): void {
  if (bytes > IMAGE_UPLOAD_MAX_BYTES) {
    throw new Error(`Image must be ≤ ${Math.round(IMAGE_UPLOAD_MAX_BYTES / 1024)} KB after optimization`);
  }
}

export function validateVideoSize(bytes: number): void {
  if (bytes > VIDEO_MAX_BYTES) throw new Error("Video must be ≤ 15 MB");
}

export function validateVideoDuration(seconds: number): void {
  if (seconds > VIDEO_MAX_DURATION_SEC) throw new Error("Video must be ≤ 30 seconds");
}

export function getMimeFromUri(uri: string): string {
  const lower = uri.split("?")[0].toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "image/jpeg";
}

async function toUploadableUri(
  uri: string,
  contentType: string
): Promise<{ uri: string; cleanup?: () => Promise<void> }> {
  const isContentUri = uri.startsWith("content://");
  if (Platform.OS !== "android" || !isContentUri) {
    return { uri };
  }
  const ext = contentType.includes("video") ? ".mp4" : ".webp";
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
  const optimized = await optimizeImageForUpload(localUri);
  validateImageSize(optimized.size);

  const fileName = `img_${Date.now()}.webp`;
  onProgress?.(0.15);

  const { uploadUrl, publicUrl: _stagingUrl, mediaFileId } = await getUploadUrl({
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
    byteSize: finalized.byteSize
  };
}
