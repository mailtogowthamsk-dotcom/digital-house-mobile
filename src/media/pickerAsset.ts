import { Platform } from "react-native";
import type { ImagePickerAsset } from "expo-image-picker";
import {
  VIDEO_MAX_DURATION_SEC,
  VIDEO_MIN_DURATION_SEC,
  VIDEO_PICKER_MAX_BYTES,
  VIDEO_PICKER_MAX_DURATION_SEC,
  formatBytes
} from "../config/media.config";
import {
  getMimeFromUri,
  isAllowedImageType,
  isAllowedVideoType,
  isVideoAsset
} from "../utils/mediaUpload";
import { appAlert } from "../utils/appAlert";
import type { PendingMediaAsset } from "./pendingMediaDraft";

function durationFromPickerAsset(asset: ImagePickerAsset): number {
  const raw = asset.duration;
  if (raw == null || raw <= 0) return 0;
  if (Platform.OS === "web" && raw <= 1000) return raw;
  return raw / 1000;
}

/** Validate picker asset and map to a local pending media draft (no upload). */
export function assetFromPickerResult(asset: ImagePickerAsset): PendingMediaAsset | null {
  const uri = asset.uri;
  const assetType = asset.type;
  const mime =
    asset.mimeType ||
    getMimeFromUri(uri, assetType === "video" ? "video/mp4" : "image/jpeg");
  const isVideo = isVideoAsset(mime, uri, assetType);
  const fileName =
    asset.fileName ||
    uri.split("/").pop() ||
    (isVideo ? "video.mp4" : "photo.jpg");
  const fileSize = asset.fileSize ?? null;
  const durationSec = isVideo ? durationFromPickerAsset(asset) : null;

  if (isVideo) {
    if (!isAllowedVideoType(mime) && !/\.(mp4|mov|m4v)(\?|$)/i.test(uri)) {
      appAlert("Unsupported video", "Only MP4 (H.264 + AAC) videos are allowed. Other formats are remuxed when possible.");
      return null;
    }
    if (durationSec != null && durationSec > 0 && durationSec > VIDEO_PICKER_MAX_DURATION_SEC) {
      appAlert(
        "Video too long",
        `Please choose a video under ${Math.floor(VIDEO_PICKER_MAX_DURATION_SEC / 60)} minutes.`
      );
      return null;
    }
    if (durationSec != null && durationSec > 0 && durationSec > VIDEO_MAX_DURATION_SEC) {
      // Allowed into preview — trim screen will open automatically.
    } else if (durationSec != null && durationSec > 0 && durationSec < VIDEO_MIN_DURATION_SEC) {
      appAlert("Video too short", "Video must be at least 3 seconds long.");
      return null;
    }
    if (fileSize != null && fileSize > VIDEO_PICKER_MAX_BYTES) {
      appAlert(
        "Video too large",
        `Max ${formatBytes(VIDEO_PICKER_MAX_BYTES)} before compression.`
      );
      return null;
    }
  } else if (!isAllowedImageType(mime)) {
    appAlert("Unsupported image", "Only JPEG, PNG, or WebP images are allowed.");
    return null;
  }

  return {
    uri,
    kind: isVideo ? "video" : "image",
    mimeType: mime,
    fileName,
    fileSize,
    width: asset.width ?? null,
    height: asset.height ?? null,
    durationSec: durationSec && durationSec > 0 ? durationSec : null
  };
}
