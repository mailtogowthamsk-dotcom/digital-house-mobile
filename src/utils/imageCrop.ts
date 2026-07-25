import * as ImageManipulator from "expo-image-manipulator";
import type { ImageCropRect } from "../media/cropTypes";

export type CroppedImage = {
  uri: string;
  width: number;
  height: number;
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Ensure crop rect is integer, inside bounds, and at least 1×1. */
export function normalizeCropRect(
  rect: ImageCropRect,
  imageWidth: number,
  imageHeight: number
): ImageCropRect {
  const iw = Math.max(1, Math.floor(imageWidth));
  const ih = Math.max(1, Math.floor(imageHeight));
  let originX = Math.floor(clamp(rect.originX, 0, iw - 1));
  let originY = Math.floor(clamp(rect.originY, 0, ih - 1));
  let width = Math.floor(clamp(rect.width, 1, iw - originX));
  let height = Math.floor(clamp(rect.height, 1, ih - originY));
  if (width < 1) width = 1;
  if (height < 1) height = 1;
  return { originX, originY, width, height };
}

/**
 * Apply a user-confirmed crop. Uses JPEG at full quality — upload pipeline
 * still runs optimizeImageForUpload later (no double WebP here).
 */
export async function applyImageCrop(
  sourceUri: string,
  rect: ImageCropRect,
  imageWidth: number,
  imageHeight: number
): Promise<CroppedImage> {
  const crop = normalizeCropRect(rect, imageWidth, imageHeight);
  const fullFrame =
    crop.originX <= 0 &&
    crop.originY <= 0 &&
    crop.width >= imageWidth - 1 &&
    crop.height >= imageHeight - 1;

  if (fullFrame) {
    return {
      uri: sourceUri,
      width: Math.floor(imageWidth),
      height: Math.floor(imageHeight)
    };
  }

  const result = await ImageManipulator.manipulateAsync(
    sourceUri,
    [{ crop }],
    {
      compress: 1,
      format: ImageManipulator.SaveFormat.JPEG
    }
  );

  return {
    uri: result.uri,
    width: result.width,
    height: result.height
  };
}

/**
 * Compute the largest centered crop of `ratio` (width/height) inside the image.
 * Used when the user selects a ratio with no pan offset (default framing).
 */
export function centeredCropForRatio(
  imageWidth: number,
  imageHeight: number,
  ratio: number | null
): ImageCropRect {
  const iw = Math.max(1, imageWidth);
  const ih = Math.max(1, imageHeight);
  if (ratio == null || ratio <= 0) {
    return { originX: 0, originY: 0, width: iw, height: ih };
  }
  const imageRatio = iw / ih;
  if (imageRatio > ratio) {
    const width = ih * ratio;
    const originX = (iw - width) / 2;
    return { originX, originY: 0, width, height: ih };
  }
  const height = iw / ratio;
  const originY = (ih - height) / 2;
  return { originX: 0, originY, width: iw, height };
}
