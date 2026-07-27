/** Cached remote image dimensions to prevent feed layout shift. */

const aspectRatioByUri = new Map<string, number>();
const MAX_ASPECT_ENTRIES = 200;

/** Instagram-style portrait default until real dimensions load */
export const DEFAULT_FEED_ASPECT_RATIO = 4 / 5;

/**
 * Strip signed-URL query params so cache / recyclingKey stay stable across feed refetches.
 * R2/S3 signatures change every response; path does not.
 */
export function stableMediaCacheKey(uri: string | null | undefined): string {
  if (!uri) return "";
  const trimmed = uri.trim();
  const q = trimmed.indexOf("?");
  return q >= 0 ? trimmed.slice(0, q) : trimmed;
}

export function getCachedAspectRatio(resolvedUri: string | null | undefined): number | null {
  if (!resolvedUri) return null;
  return aspectRatioByUri.get(stableMediaCacheKey(resolvedUri)) ?? null;
}

export function setCachedAspectRatio(resolvedUri: string, width: number, height: number): number {
  const key = stableMediaCacheKey(resolvedUri);
  const ratio = width > 0 && height > 0 ? height / width : DEFAULT_FEED_ASPECT_RATIO;
  if (!key) return ratio;
  if (aspectRatioByUri.size >= MAX_ASPECT_ENTRIES && !aspectRatioByUri.has(key)) {
    const first = aspectRatioByUri.keys().next().value;
    if (first) aspectRatioByUri.delete(first);
  }
  aspectRatioByUri.set(key, ratio);
  return ratio;
}

export function prefetchAspectRatio(resolvedUri: string): Promise<number> {
  const key = stableMediaCacheKey(resolvedUri);
  const cached = key ? aspectRatioByUri.get(key) : undefined;
  if (cached != null) return Promise.resolve(cached);

  return new Promise((resolve) => {
    const { Image } = require("react-native");
    Image.getSize(
      resolvedUri,
      (w: number, h: number) => resolve(setCachedAspectRatio(resolvedUri, w, h)),
      () => {
        if (key) aspectRatioByUri.set(key, DEFAULT_FEED_ASPECT_RATIO);
        resolve(DEFAULT_FEED_ASPECT_RATIO);
      }
    );
  });
}

export function prefetchAspectRatios(uris: string[]): void {
  for (const uri of uris) {
    if (!uri) continue;
    if (!aspectRatioByUri.has(stableMediaCacheKey(uri))) {
      prefetchAspectRatio(uri).catch(() => {});
    }
  }
}

/** True when height change would be visually noisy in a FlatList. */
export function aspectRatioChangedMeaningfully(
  prev: number | null | undefined,
  next: number,
  threshold = 0.04
): boolean {
  if (prev == null || !(prev > 0)) return true;
  return Math.abs(next - prev) / prev > threshold;
}
