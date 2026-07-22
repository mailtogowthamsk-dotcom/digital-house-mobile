/**
 * Client-side video compression for social posts.
 * Caps longest edge at 720p and targets ~2 Mbps H.264 before R2 upload.
 *
 * react-native-compressor requires a custom native build (EAS / expo run).
 * Expo Go has no native module — we skip the import entirely to avoid redbox errors.
 */

import { NativeModules } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";
import {
  VIDEO_MAX_BYTES,
  VIDEO_MAX_DIMENSION,
  VIDEO_PICKER_MAX_BYTES,
  VIDEO_TARGET_BITRATE,
  formatBytes
} from "../config/media.config";

export type OptimizeVideoResult = {
  uri: string;
  size: number;
  mimeType: string;
  /** True when a compressed file was produced (caller should delete when done). */
  didCompress: boolean;
  cleanup?: () => Promise<void>;
};

async function getLocalFileSize(uri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists || info.isDirectory) return 0;
  return typeof (info as { size?: number }).size === "number"
    ? (info as { size: number }).size
    : 0;
}

function normalizeCompressUri(uri: string): string {
  // react-native-compressor expects a file path / file:// URI
  if (uri.startsWith("file://") || uri.startsWith("content://") || uri.startsWith("ph://")) {
    return uri;
  }
  return uri.startsWith("/") ? `file://${uri}` : uri;
}

function isExpoGo(): boolean {
  return (
    Constants.appOwnership === "expo" ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  );
}

/** True when the native compressor module is present (dev client / EAS, not Expo Go). */
function isNativeCompressorAvailable(): boolean {
  if (isExpoGo()) return false;
  return NativeModules.Compressor != null;
}

function uncompressedFallback(
  localUri: string,
  rawSize: number,
  onProgress?: (progress: number) => void
): OptimizeVideoResult {
  onProgress?.(1);
  return {
    uri: localUri,
    size: rawSize,
    mimeType: "video/mp4",
    didCompress: false
  };
}

/**
 * Compress video to ≤720p when native compressor is available (EAS / dev builds).
 * Expo Go / missing native module: fall back to original only if ≤ VIDEO_MAX_BYTES.
 * Always enforces picker + upload size caps.
 */
export async function optimizeVideoForUpload(
  localUri: string,
  options: {
    onProgress?: (progress: number) => void;
  } = {}
): Promise<OptimizeVideoResult> {
  const rawSize = await getLocalFileSize(localUri);
  if (rawSize <= 0) {
    throw new Error("Could not read video file size");
  }
  if (rawSize > VIDEO_PICKER_MAX_BYTES) {
    throw new Error(
      `Video is too large to process (max ${formatBytes(VIDEO_PICKER_MAX_BYTES)} before compression). Choose a shorter clip.`
    );
  }

  if (!isNativeCompressorAvailable()) {
    // Never import react-native-compressor in Expo Go — module init throws a redbox.
    if (rawSize <= VIDEO_MAX_BYTES) {
      return uncompressedFallback(localUri, rawSize, options.onProgress);
    }
    throw new Error(
      `Video must be ≤ ${formatBytes(VIDEO_MAX_BYTES)}. Compression needs a development/EAS build (not Expo Go).`
    );
  }

  let compressedUri: string | null = null;
  try {
    const { Video } = await import("react-native-compressor");
    options.onProgress?.(0.02);
    compressedUri = await Video.compress(
      normalizeCompressUri(localUri),
      {
        compressionMethod: "manual",
        maxSize: VIDEO_MAX_DIMENSION,
        bitrate: VIDEO_TARGET_BITRATE,
        minimumFileSizeForCompress: 0
      },
      (p) => {
        const n = typeof p === "number" ? p : 0;
        options.onProgress?.(Math.max(0.02, Math.min(0.98, n)));
      }
    );
    options.onProgress?.(1);
  } catch (e) {
    // Linked build but compress failed — allow small originals in __DEV__ only.
    if (typeof __DEV__ !== "undefined" && __DEV__ && rawSize <= VIDEO_MAX_BYTES) {
      return uncompressedFallback(localUri, rawSize, options.onProgress);
    }
    const msg =
      e instanceof Error && /compressor|NativeModule|linked|Expo Go/i.test(e.message)
        ? `Video compression is required. Use a development/EAS build (max ${formatBytes(VIDEO_MAX_BYTES)} after compress).`
        : e instanceof Error
          ? e.message
          : "Video compression failed";
    throw new Error(msg);
  }

  if (!compressedUri) {
    throw new Error("Video compression produced no output");
  }

  const outSize = await getLocalFileSize(compressedUri);
  if (outSize <= 0) {
    throw new Error("Could not read compressed video size");
  }
  if (outSize > VIDEO_MAX_BYTES) {
    throw new Error(
      `Video is still too large after compression (max ${formatBytes(VIDEO_MAX_BYTES)}). Try a shorter clip.`
    );
  }

  const outPath = compressedUri;
  return {
    uri: outPath,
    size: outSize,
    mimeType: "video/mp4",
    didCompress: outPath !== localUri,
    cleanup: async () => {
      if (outPath === localUri) return;
      try {
        const info = await FileSystem.getInfoAsync(outPath);
        if (info.exists) await FileSystem.deleteAsync(outPath, { idempotent: true });
      } catch {
        // ignore
      }
    }
  };
}
