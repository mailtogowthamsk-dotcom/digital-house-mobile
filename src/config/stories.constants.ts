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

/** Home tray: prefetch at most this many upcoming stories (not the whole tray). */
export const STORY_PREFETCH_MAX_ITEMS = 3;
/** Max parallel story media downloads during prefetch. */
export const STORY_PREFETCH_CONCURRENCY = 2;
