/**
 * Direct upload to R2 via pre-signed PUT URL.
 * Backend never receives file bytes; client uploads with progress.
 * Uses expo-file-system (legacy). On Android, content:// URIs are copied to a temp file://
 * before upload because uploadAsync only accepts file:// URIs.
 */

import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

const IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const VIDEO_MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const VIDEO_MAX_DURATION_SEC = 30;

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];
export const ALLOWED_VIDEO_TYPES = ["video/mp4"];

export function isAllowedImageType(mime: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(mime.toLowerCase());
}

export function isAllowedVideoType(mime: string): boolean {
  return ALLOWED_VIDEO_TYPES.includes(mime.toLowerCase());
}

export function validateImageSize(bytes: number): void {
  if (bytes > IMAGE_MAX_BYTES) throw new Error("Image must be ≤ 5 MB");
}

export function validateVideoSize(bytes: number): void {
  if (bytes > VIDEO_MAX_BYTES) throw new Error("Video must be ≤ 15 MB");
}

export function validateVideoDuration(seconds: number): void {
  if (seconds > VIDEO_MAX_DURATION_SEC) throw new Error("Video must be ≤ 30 seconds");
}

/**
 * On Android, uploadAsync only accepts file:// URIs. Image/video pickers often return
 * content:// URIs. Copy to a temp file in cache then upload from there.
 */
async function toUploadableUri(uri: string, contentType: string): Promise<{ uri: string; cleanup?: () => Promise<void> }> {
  const isContentUri = uri.startsWith("content://");
  if (Platform.OS !== "android" || !isContentUri) {
    return { uri };
  }
  const ext = contentType.includes("video") ? ".mp4" : ".jpg";
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
 * On Android content:// URIs are copied to a temp file:// before upload.
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
      headers: {
        "Content-Type": contentType
      }
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
