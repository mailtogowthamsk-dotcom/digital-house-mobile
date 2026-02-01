import { api } from "./client";

/** Allowed modules for R2 folder structure */
export type MediaModule = "profile" | "posts" | "jobs" | "marketplace" | "matrimony" | "help";

export type UploadUrlRequest = {
  fileName: string;
  fileType: string;
  fileSize: number;
  module: MediaModule;
};

export type UploadUrlResponse = {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  mediaFileId: number;
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
