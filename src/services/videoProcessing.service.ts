/**
 * Video trim + temp-file lifecycle for Create Post.
 * Uses react-native-lossless-trim (native passthrough) when available.
 */

import * as FileSystem from "expo-file-system/legacy";
import {
  VIDEO_MAX_DURATION_SEC,
  VIDEO_MIN_DURATION_SEC
} from "../config/media.config";

export type TrimRange = {
  startSec: number;
  endSec: number;
};

export type TrimResult = {
  uri: string;
  durationSec: number;
  startSec: number;
  endSec: number;
  /** Delete when upload finishes or user discards. */
  cleanup: () => Promise<void>;
};

const tempUris = new Set<string>();

export function trimmedDurationSec(range: TrimRange): number {
  return Math.max(0, range.endSec - range.startSec);
}

export function validateTrimRange(
  range: TrimRange,
  sourceDurationSec: number
): { ok: true } | { ok: false; message: string } {
  const duration = trimmedDurationSec(range);
  if (!Number.isFinite(range.startSec) || !Number.isFinite(range.endSec)) {
    return { ok: false, message: "Invalid trim range." };
  }
  if (range.startSec < 0 || range.endSec > sourceDurationSec + 0.05) {
    return { ok: false, message: "Trim handles are out of range." };
  }
  if (duration < VIDEO_MIN_DURATION_SEC) {
    return { ok: false, message: "Video must be at least 3 seconds long." };
  }
  if (duration > VIDEO_MAX_DURATION_SEC) {
    return { ok: false, message: "Trim your video to continue." };
  }
  return { ok: true };
}

export function needsRequiredTrim(sourceDurationSec: number): boolean {
  return sourceDurationSec > VIDEO_MAX_DURATION_SEC;
}

async function deleteQuiet(uri: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    /* best-effort */
  } finally {
    tempUris.delete(uri);
  }
}

export function trackTempVideoUri(uri: string): void {
  if (uri) tempUris.add(uri);
}

export async function cleanupTempVideoUri(uri: string | null | undefined): Promise<void> {
  if (!uri) return;
  await deleteQuiet(uri);
}

export async function cleanupAllTempVideos(): Promise<void> {
  const urls = [...tempUris];
  await Promise.all(urls.map((u) => deleteQuiet(u)));
}

function friendlyTrimError(e: unknown): string {
  const code = (e as { code?: string })?.code;
  const message = e instanceof Error ? e.message : String(e);
  if (code === "ERR_UNAVAILABLE") {
    return "Video trimming needs a development build (not Expo Go). Run: npx expo run:ios  or  npx expo run:android";
  }
  if (code === "ERR_INVALID_RANGE") {
    return "Invalid trim range. Try adjusting the handles.";
  }
  if (code === "ERR_INVALID_URI") {
    return "This video file could not be opened. Try another clip.";
  }
  if (/storage|space|ENOSPC/i.test(message)) {
    return "Not enough storage to trim this video. Free some space and try again.";
  }
  if (/memory|OOM/i.test(message)) {
    return "This video is too large to process on this device. Try a shorter clip.";
  }
  return message || "Could not trim this video. Please try again.";
}

/**
 * Trim once on user confirm. Does not run while dragging handles.
 */
export async function trimVideoOnce(
  sourceUri: string,
  range: TrimRange,
  sourceDurationSec: number
): Promise<TrimResult> {
  const check = validateTrimRange(range, sourceDurationSec);
  if (!check.ok) {
    throw new Error(check.message);
  }

  let trimAsync: typeof import("react-native-lossless-trim").trimAsync;
  let isAvailable: typeof import("react-native-lossless-trim").isAvailable;
  try {
    const mod = await import("react-native-lossless-trim");
    trimAsync = mod.trimAsync;
    isAvailable = mod.isAvailable;
  } catch {
    throw new Error(
      "Video trimming needs a development build (not Expo Go). Run: npx expo run:ios  or  npx expo run:android"
    );
  }

  if (!isAvailable()) {
    throw new Error(
      "Video trimming needs a development build (not Expo Go). Run: npx expo run:ios  or  npx expo run:android"
    );
  }

  const startMs = Math.max(0, Math.round(range.startSec * 1000));
  const endMs = Math.max(startMs + VIDEO_MIN_DURATION_SEC * 1000, Math.round(range.endSec * 1000));

  try {
    const { uri } = await trimAsync(sourceUri, { startMs, endMs });
    trackTempVideoUri(uri);
    const durationSec = trimmedDurationSec({
      startSec: startMs / 1000,
      endSec: endMs / 1000
    });
    return {
      uri,
      durationSec,
      startSec: startMs / 1000,
      endSec: endMs / 1000,
      cleanup: () => cleanupTempVideoUri(uri)
    };
  } catch (e) {
    throw new Error(friendlyTrimError(e));
  }
}

/** Default trim window when a long video opens the trimmer. */
export function defaultTrimRange(sourceDurationSec: number): TrimRange {
  const end = Math.min(sourceDurationSec, VIDEO_MAX_DURATION_SEC);
  return { startSec: 0, endSec: Math.max(VIDEO_MIN_DURATION_SEC, end) };
}
