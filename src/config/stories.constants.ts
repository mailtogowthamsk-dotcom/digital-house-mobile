/**
 * Stories product contract — keep aligned with backend
 * `backend/src/constants/stories.constants.ts`.
 * Backend ffprobe is the security authority for video duration.
 */
export const STORY_VIDEO_MIN_DURATION_SEC = 3;
/** Final story clip after trim (1 minute). Keep in sync with backend. */
export const STORY_VIDEO_MAX_DURATION_SEC = 60;
/**
 * Gallery may return longer clips; Create Story opens the trim UI until ≤ max.
 * Same picker ceiling as posts.
 */
export const STORY_VIDEO_PICKER_MAX_DURATION_SEC = 10 * 60;
/** Caption overlay / text-story body (matches backend). */
export const STORY_CAPTION_MAX_LENGTH = 200;
export const STORY_TEXT_DURATION_MS = 7_000;

/**
 * Story video encode (full-screen vertical). Higher than feed posts (720p/2Mbps)
 * so Stories do not look soft on modern phones. Still ≤50MB for ≤60s clips.
 */
export const STORY_VIDEO_MAX_DIMENSION = 1080;
/** ~4.5 Mbps H.264 — clear 1080p without blowing the 50MB story upload cap. */
export const STORY_VIDEO_TARGET_BITRATE = 4_500_000;

/** Home tray must NOT prefetch media (startup bandwidth). Kept for optional callers. */
export const STORY_PREFETCH_MAX_ITEMS = 0;
/** Max parallel story media downloads during prefetch (viewer nearby only). */
export const STORY_PREFETCH_CONCURRENCY = 2;
