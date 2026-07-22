import { api } from "./client";

/** Allowed modules for R2 folder structure */
export type MediaModule = "profile" | "posts" | "jobs" | "marketplace" | "matrimony" | "help";

export type UploadUrlRequest = {
  fileName: string;
  fileType: string;
  fileSize: number;
  module: MediaModule;
  /** R2 folder purpose — video | video_thumbnail | image */
  purpose?: "image" | "video" | "video_thumbnail";
};

export type UploadUrlResponse = {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  mediaFileId: number;
};

export type MediaVariants = {
  thumb: string;
  medium: string;
  full: string;
};

export type FinalizeMediaResponse = {
  mediaFileId: number;
  publicUrl: string;
  variants: MediaVariants;
  width: number;
  height: number;
  byteSize: number;
};

/**
 * POST /api/media/upload-url
 * Get pre-signed PUT URL and CDN public URL for direct upload to R2.
 * Client then PUTs file to uploadUrl (no auth); stores publicUrl in post/profile.
 */
export async function getUploadUrl(payload: UploadUrlRequest): Promise<UploadUrlResponse> {
  const { data } = await api.post<{ ok: boolean } & UploadUrlResponse>("/media/upload-url", payload);
  if (!data.ok) throw new Error("Failed to get upload URL");
  return {
    uploadUrl: (data as any).uploadUrl,
    publicUrl: (data as any).publicUrl,
    key: (data as any).key,
    mediaFileId: (data as any).mediaFileId
  };
}

/**
 * POST /api/media/finalize – server optimizes uploaded image into WebP variants.
 */
export async function finalizeMedia(mediaFileId: number): Promise<FinalizeMediaResponse> {
  const { data } = await api.post<{ ok: boolean } & FinalizeMediaResponse>("/media/finalize", {
    mediaFileId
  });
  if (!data.ok) throw new Error("Failed to process image");
  return {
    mediaFileId: data.mediaFileId,
    publicUrl: data.publicUrl,
    variants: data.variants,
    width: data.width,
    height: data.height,
    byteSize: data.byteSize
  };
}

/**
 * POST /api/media/delete – remove uploaded image(s) from R2 (all variants).
 */
export async function deleteMediaUrls(urls: string[]): Promise<{ deleted: number }> {
  const cleaned = urls.map((u) => u.trim()).filter(Boolean);
  if (cleaned.length === 0) return { deleted: 0 };
  const { data } = await api.post<{ ok: boolean; deleted?: number }>("/media/delete", {
    urls: cleaned
  });
  if (!data.ok) throw new Error("Failed to delete media");
  return { deleted: data.deleted ?? cleaned.length };
}
