/**
 * In-memory draft for media selected on Create Post before upload.
 * Avoids stuffing large file URIs through navigation params repeatedly.
 */

export type PendingMediaKind = "image" | "video";

export type PendingMediaAsset = {
  uri: string;
  kind: PendingMediaKind;
  mimeType: string;
  fileName: string;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  /**
   * Future: video trim window (seconds). Not applied in V1.
   * Architecture keeps these optional so trim UI can plug in later.
   */
  trimStartSec?: number;
  trimEndSec?: number;
  /** Future: selected cover frame ms for videos. */
  coverFrameMs?: number;
  /**
   * Temp trimmed file to delete after successful upload (or discard).
   * Set when lossless trim produced a cache file.
   */
  tempFileUri?: string;
};

export type MediaPreviewMode = "create" | "replace";

export type MediaPreviewResult = "confirmed" | "removed";

type DraftSession = {
  asset: PendingMediaAsset;
  mode: MediaPreviewMode;
};

let session: DraftSession | null = null;
let result: MediaPreviewResult | null = null;
let confirmedAsset: PendingMediaAsset | null = null;

/** Marketplace local photos awaiting upload (not yet on CDN). */
let galleryLocals: PendingMediaAsset[] = [];

export const pendingMediaDraft = {
  open(asset: PendingMediaAsset, mode: MediaPreviewMode = "create"): void {
    session = { asset, mode };
    result = null;
    confirmedAsset = null;
  },

  updateAsset(asset: PendingMediaAsset): void {
    if (!session) {
      session = { asset, mode: "create" };
      return;
    }
    session = { ...session, asset };
  },

  getMode(): MediaPreviewMode | null {
    return session?.mode ?? null;
  },

  getAsset(): PendingMediaAsset | null {
    return session?.asset ?? null;
  },

  confirm(asset?: PendingMediaAsset): void {
    const finalAsset = asset ?? session?.asset ?? null;
    if (!finalAsset) return;
    confirmedAsset = finalAsset;
    result = "confirmed";
    session = null;
  },

  markRemoved(): void {
    result = "removed";
    confirmedAsset = null;
    session = null;
  },

  /** Discard without applying (user closed preview). */
  discard(): void {
    session = null;
    // Do not clear a prior unused result mid-flight.
  },

  /**
   * Create Post reads once on focus.
   * Returns null when the user backed out without confirming.
   */
  consumeResult(): { result: MediaPreviewResult; asset: PendingMediaAsset | null } | null {
    if (!result) return null;
    const out = { result, asset: confirmedAsset };
    result = null;
    confirmedAsset = null;
    return out;
  },

  setGalleryLocals(assets: PendingMediaAsset[]): void {
    galleryLocals = assets.slice();
  },

  getGalleryLocals(): PendingMediaAsset[] {
    return galleryLocals.slice();
  },

  appendGalleryLocals(assets: PendingMediaAsset[]): PendingMediaAsset[] {
    galleryLocals = [...galleryLocals, ...assets];
    return galleryLocals.slice();
  },

  removeGalleryLocalAt(index: number): PendingMediaAsset[] {
    galleryLocals = galleryLocals.filter((_, i) => i !== index);
    return galleryLocals.slice();
  },

  clearGalleryLocals(): void {
    galleryLocals = [];
  },

  clearAll(): void {
    session = null;
    result = null;
    confirmedAsset = null;
    galleryLocals = [];
  }
};
