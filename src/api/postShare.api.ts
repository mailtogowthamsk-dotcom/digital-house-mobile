import { api } from "./client";
import type { PostDetailResponse } from "./posts.api";

export type SharePostToConnectionsPayload = {
  recipientIds: number[];
  message?: string;
};

export type SharePostResult = {
  sent: number;
  failed: Array<{ recipientId: number; reason: string }>;
};

export async function sharePostToConnections(
  postId: number,
  payload: SharePostToConnectionsPayload
): Promise<SharePostResult> {
  const res = await api.post<{ ok: true; sent: number; failed: SharePostResult["failed"] }>(
    `/posts/${postId}/share`,
    {
      recipient_ids: payload.recipientIds,
      message: payload.message
    }
  );
  return { sent: res.data.sent ?? 0, failed: res.data.failed ?? [] };
}

export async function repostPost(postId: number): Promise<PostDetailResponse> {
  const res = await api.post<{ ok: true } & PostDetailResponse>(`/posts/${postId}/repost`);
  const { ok: _ok, ...post } = res.data;
  return post as PostDetailResponse;
}
