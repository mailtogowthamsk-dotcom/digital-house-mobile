import { api, getApiBaseUrl } from "./client";
import * as FileSystem from "expo-file-system/legacy";
import { getTokenReliable } from "../storage/token.storage";

export type StoryItem = {
  id: number;
  user_id: number;
  media_type: "image" | "video";
  media_url: string | null;
  caption?: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  duration_ms: number;
  created_at: string;
  expires_at: string;
  viewed_by_me?: boolean;
  view_count?: number;
  liked_by_me?: boolean;
  like_count?: number;
};

export type StoryUser = {
  id: number;
  name: string;
  username: string | null;
  profile_image: string | null;
};

export type StoryGroup = {
  user: StoryUser;
  has_unseen: boolean;
  latest_at: string;
  is_own: boolean;
  stories: StoryItem[];
};

export type StoryViewer = {
  user_id: number;
  name: string;
  username: string | null;
  profile_image: string | null;
  viewed_at: string;
};

export async function getStoryTray(): Promise<StoryGroup[]> {
  const { data } = await api.get<{ ok: boolean; groups: StoryGroup[] }>("/stories");
  if (!data.ok) throw new Error("Failed to load stories");
  return data.groups ?? [];
}

export async function getStory(storyId: number): Promise<StoryItem> {
  const { data } = await api.get<{ ok: boolean; story: StoryItem }>(`/stories/${storyId}`);
  if (!data.ok || !data.story) throw new Error("Story not found");
  return data.story;
}

export async function createStory(payload: {
  media_url: string;
  media_type: "image" | "video";
  caption?: string | null;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
  mime_type?: string | null;
  file_size?: number | null;
}): Promise<StoryItem> {
  const { data } = await api.post<{ ok: boolean; story: StoryItem }>("/stories", payload);
  if (!data.ok || !data.story) throw new Error("Failed to post story");
  return data.story;
}

/**
 * PUT raw bytes to the API server disk (NOT R2).
 * Returns local key: local/stories/{userId}/...
 */
export async function uploadStoryMediaToServer(
  localUri: string,
  mimeType: string,
  onProgress?: (progress: number) => void
): Promise<{ key: string; byte_size: number; mime_type: string }> {
  const token = await getTokenReliable();
  if (!token) throw new Error("Not signed in");

  const uploadUrl = `${getApiBaseUrl()}/stories/upload?mime=${encodeURIComponent(mimeType)}`;
  onProgress?.(0.1);
  const result = await FileSystem.uploadAsync(uploadUrl, localUri, {
    httpMethod: "PUT",
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      "Content-Type": mimeType,
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    }
  });
  onProgress?.(1);
  if (result.status < 200 || result.status >= 300) {
    let message = `Upload failed (${result.status})`;
    try {
      const parsed = JSON.parse(result.body || "{}") as { message?: string };
      if (parsed.message) message = parsed.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  const parsed = JSON.parse(result.body || "{}") as {
    ok?: boolean;
    key?: string;
    byte_size?: number;
    mime_type?: string;
  };
  if (!parsed.ok || !parsed.key) {
    throw new Error("Upload failed");
  }
  return {
    key: parsed.key,
    byte_size: parsed.byte_size ?? 0,
    mime_type: parsed.mime_type ?? mimeType
  };
}

export async function markStoryViewed(storyId: number): Promise<void> {
  await api.post(`/stories/${storyId}/view`);
}

export async function getStoryViewers(storyId: number): Promise<StoryViewer[]> {
  const { data } = await api.get<{ ok: boolean; viewers: StoryViewer[] }>(
    `/stories/${storyId}/viewers`
  );
  if (!data.ok) throw new Error("Failed to load viewers");
  return data.viewers ?? [];
}

export async function toggleStoryLike(
  storyId: number
): Promise<{ liked: boolean; like_count: number }> {
  const { data } = await api.post<{ ok: boolean; liked: boolean; like_count: number }>(
    `/stories/${storyId}/like`
  );
  if (!data.ok) throw new Error("Failed to like story");
  return { liked: !!data.liked, like_count: Number(data.like_count) || 0 };
}

export async function replyToStory(
  storyId: number,
  body: string
): Promise<{ sent: boolean; recipient_user_id: number }> {
  const { data } = await api.post<{
    ok: boolean;
    sent: boolean;
    recipient_user_id: number;
  }>(`/stories/${storyId}/reply`, { body });
  if (!data.ok || !data.sent) throw new Error("Failed to send comment");
  return { sent: true, recipient_user_id: data.recipient_user_id };
}

export async function deleteStory(storyId: number): Promise<void> {
  const { data } = await api.delete<{ ok: boolean }>(`/stories/${storyId}`);
  if (!data.ok) throw new Error("Failed to delete story");
}
