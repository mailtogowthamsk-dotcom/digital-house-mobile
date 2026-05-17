/** Client-side image optimization targets (keep in sync with backend). */

export const IMAGE_MAX_DIMENSION = 1920;
export const IMAGE_TARGET_BYTES = 450_000;
export const IMAGE_MEDIUM_MAX = 1080;
export const IMAGE_THUMB_MAX = 320;

/** Pickers may return huge files; we compress before upload. */
export const IMAGE_PICKER_MAX_BYTES = 25 * 1024 * 1024;

/** Must match backend IMAGE_UPLOAD_MAX_BYTES after compression. */
export const IMAGE_UPLOAD_MAX_BYTES = 2 * 1024 * 1024;
