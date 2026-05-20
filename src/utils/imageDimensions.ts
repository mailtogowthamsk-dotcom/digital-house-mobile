/** Cached remote image dimensions to prevent feed layout shift. */
const aspectRatioByUri = new Map<string, number>();

/** Instagram-style portrait default until real dimensions load */
export const DEFAULT_FEED_ASPECT_RATIO = 4 / 5;

export function getCachedAspectRatio(resolvedUri: string | null | undefined): number | null {
  if (!resolvedUri) return null;
  return aspectRatioByUri.get(resolvedUri) ?? null;
}

export function setCachedAspectRatio(resolvedUri: string, width: number, height: number): number {
  const ratio = width > 0 && height > 0 ? height / width : DEFAULT_FEED_ASPECT_RATIO;
  aspectRatioByUri.set(resolvedUri, ratio);
  return ratio;
}

export function prefetchAspectRatio(resolvedUri: string): Promise<number> {
  const cached = aspectRatioByUri.get(resolvedUri);
  if (cached != null) return Promise.resolve(cached);

  return new Promise((resolve) => {
    const { Image } = require("react-native");
    Image.getSize(
      resolvedUri,
      (w: number, h: number) => resolve(setCachedAspectRatio(resolvedUri, w, h)),
      () => resolve(setCachedAspectRatio(resolvedUri, 1, DEFAULT_FEED_ASPECT_RATIO))
    );
  });
}

export function prefetchAspectRatios(uris: string[]): void {
  for (const uri of uris) {
    if (!aspectRatioByUri.has(uri)) prefetchAspectRatio(uri).catch(() => {});
  }
}
