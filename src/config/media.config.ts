/** Client-side media limits for social posts (keep in sync with backend). */

export const IMAGE_MAX_DIMENSION = 1920;
export const IMAGE_TARGET_BYTES = 450_000;
export const IMAGE_MEDIUM_MAX = 1080;
export const IMAGE_THUMB_MAX = 320;

/** Picker may return larger files; we compress images before upload. */
export const IMAGE_PICKER_MAX_BYTES = 10 * 1024 * 1024;

/** Must match backend after compression. */
export const IMAGE_UPLOAD_MAX_BYTES = 2 * 1024 * 1024;

/**
 * Raw picker reject threshold — absurd camera dumps before we even try to compress.
 * Final upload must still be ≤ VIDEO_MAX_BYTES.
 */
export const VIDEO_PICKER_MAX_BYTES = 200 * 1024 * 1024;

/** Max video size after compression (must match backend). */
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

/** Max video duration (2 minutes). */
export const VIDEO_MAX_DURATION_SEC = 120;

/** Longest edge after compression (720p). */
export const VIDEO_MAX_DIMENSION = 720;

/** Target bitrate for mobile-friendly 720p (~2 Mbps). */
export const VIDEO_TARGET_BITRATE = 2_000_000;

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp"
] as const;

/** MP4, MOV (QuickTime), M4V */
export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-m4v",
  "video/m4v"
] as const;

export type PostMediaKind = "image" | "video" | "none";

export type VideoUploadStage = "compressing" | "uploading" | "processing" | "done";

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
}

export function videoUploadStageLabel(stage: VideoUploadStage): string {
  switch (stage) {
    case "compressing":
      return "Compressing video…";
    case "uploading":
      return "Uploading…";
    case "processing":
      return "Processing…";
    case "done":
      return "Completed";
    default:
      return "Uploading…";
  }
}
