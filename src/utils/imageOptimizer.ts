/**
 * Client-side resize + WebP compression before upload (reduces bandwidth & storage).
 */

import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
import {
  IMAGE_MAX_DIMENSION,
  IMAGE_TARGET_BYTES,
  IMAGE_PICKER_MAX_BYTES,
  IMAGE_UPLOAD_MAX_BYTES
} from "../config/image.config";

export type OptimizedImage = {
  uri: string;
  mime: "image/webp";
  size: number;
  width: number;
  height: number;
};

async function getFileSize(uri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists || info.size == null) return 0;
  return info.size;
}

/**
 * Resize, strip metadata (re-encode), compress to WebP near target byte size.
 */
export async function optimizeImageForUpload(sourceUri: string): Promise<OptimizedImage> {
  const sourceSize = await getFileSize(sourceUri);
  if (sourceSize > IMAGE_PICKER_MAX_BYTES) {
    throw new Error("Image is too large. Please choose a smaller photo.");
  }

  let quality = 0.82;
  let lastUri = sourceUri;
  let lastW = 0;
  let lastH = 0;

  for (let attempt = 0; attempt < 10; attempt++) {
    const result = await ImageManipulator.manipulateAsync(
      sourceUri,
      [{ resize: { width: IMAGE_MAX_DIMENSION } }],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.WEBP
      }
    );
    lastUri = result.uri;
    lastW = result.width;
    lastH = result.height;
    const size = await getFileSize(result.uri);

    if (size > 0 && size <= IMAGE_TARGET_BYTES) {
      if (size > IMAGE_UPLOAD_MAX_BYTES) {
        throw new Error("Optimized image still too large. Try a smaller photo.");
      }
      return { uri: result.uri, mime: "image/webp", size, width: lastW, height: lastH };
    }

    if (quality <= 0.45) {
      if (size > IMAGE_UPLOAD_MAX_BYTES) {
        throw new Error("Could not compress image enough. Try a smaller photo.");
      }
      return {
        uri: lastUri,
        mime: "image/webp",
        size: size || IMAGE_TARGET_BYTES,
        width: lastW,
        height: lastH
      };
    }
    quality -= 0.08;
  }

  const size = await getFileSize(lastUri);
  return { uri: lastUri, mime: "image/webp", size, width: lastW, height: lastH };
}
