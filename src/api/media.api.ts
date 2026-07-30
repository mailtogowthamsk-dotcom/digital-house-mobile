import { api } from "./client";

/** Allowed modules for R2 folder structure */
export type MediaModule = "profile" | "posts" | "jobs" | "marketplace" | "matrimony" | "help";

export type UploadUrlRequest = {
  fileName: string;
  fileType: string;
  fileSize: number;
  module: MediaModule;
  /** Sensitive purposes are always stored under edge-protected private prefixes. */
  purpose?: "image" | "video" | "video_thumbnail" | "horoscope" | "identity" | "support" | "chat";
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
  thumbnailUrl?: string | null;
  durationSec?: number | null;
  mediaType?: "image" | "video";
};

type ProcessingStatus = "pending" | "processing" | "completed" | "failed";
type FinalizeStateResponse = FinalizeMediaResponse & {
  processingStatus?: ProcessingStatus;
  jobId?: number | null;
  errorMessage?: string | null;
};

const MEDIA_STATUS_POLL_MS = 3_000;
const MEDIA_STATUS_TIMEOUT_MS = 15 * 60_000;

function finalizedResponse(data: FinalizeStateResponse): FinalizeMediaResponse {
  return {
    mediaFileId: data.mediaFileId,
    publicUrl: data.publicUrl,
    variants: data.variants,
    width: data.width,
    height: data.height,
    byteSize: data.byteSize,
    thumbnailUrl: data.thumbnailUrl ?? null,
    durationSec: data.durationSec ?? null,
    mediaType: data.mediaType
  };
}

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
 * Enqueue processing, then transparently poll while the standalone media worker
 * creates image variants or video H.264/AAC + posters.
 */
export async function finalizeMedia(mediaFileId: number): Promise<FinalizeMediaResponse> {
  const { data } = await api.post<{ ok: boolean } & FinalizeStateResponse>("/media/finalize", {
    mediaFileId
  });
  if (!data.ok) throw new Error("Failed to process media");
  // Old backends do not return processingStatus and already completed inline.
  if (!data.processingStatus || data.processingStatus === "completed") {
    return finalizedResponse(data);
  }
  if (data.processingStatus === "failed") {
    throw new Error(data.errorMessage || "Media processing failed");
  }

  const deadline = Date.now() + MEDIA_STATUS_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, MEDIA_STATUS_POLL_MS));
    const response = await api.get<{ ok: boolean } & FinalizeStateResponse>(
      `/media/${mediaFileId}/status`
    );
    const state = response.data;
    if (!state.ok) throw new Error("Failed to check media processing status");
    if (state.processingStatus === "completed") return finalizedResponse(state);
    if (state.processingStatus === "failed") {
      throw new Error(state.errorMessage || "Media processing failed after retries");
    }
  }
  throw new Error("Media processing is taking longer than expected. Please try again.");
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
