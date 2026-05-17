import { api } from "./client";

export type PostAuthor = {
  id: number;
  name: string;
  profile_image: string | null;
  verified: boolean;
};

export type PostDetailResponse = {
  id: number;
  user_id: number;
  post_type: string;
  title: string;
  description: string | null;
  media_url: string | null;
  pinned: boolean;
  urgent: boolean;
  meetup_at: string | null;
  job_status: string | null;
  created_at: string;
  updated_at: string;
  author: PostAuthor;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  saved_by_me?: boolean;
};

export type CommentItem = {
  id: number;
  post_id: number;
  user_id: number;
  parent_id: number | null;
  body: string;
  created_at: string;
  updated_at: string;
  author: PostAuthor;
  is_mine: boolean;
  reply_count: number;
  replies?: CommentItem[];
};

export type CommentsResponse = {
  items: CommentItem[];
  page: number;
  limit: number;
  total: number;
};

export type CreatePostPayload = {
  post_type: string;
  title: string;
  description?: string | null;
  media_url?: string | null;
  pinned?: boolean;
  urgent?: boolean;
  meetup_at?: string | null;
  job_status?: string | null;
};

export type UpdatePostPayload = {
  title?: string;
  description?: string | null;
  media_url?: string | null;
  pinned?: boolean;
  urgent?: boolean;
  meetup_at?: string | null;
  job_status?: string | null;
};

export async function getPost(postId: number): Promise<PostDetailResponse> {
  const { data } = await api.get<{ ok: boolean } & PostDetailResponse>(`/posts/${postId}`);
  if (!data.ok) throw new Error("Failed to load post");
  return data as PostDetailResponse;
}

export async function createPost(payload: CreatePostPayload): Promise<PostDetailResponse> {
  const { data } = await api.post<{ ok: boolean } & PostDetailResponse>("/posts", payload);
  if (!data.ok) throw new Error("Failed to create post");
  return data as PostDetailResponse;
}

export async function updatePost(postId: number, payload: UpdatePostPayload): Promise<PostDetailResponse> {
  const { data } = await api.put<{ ok: boolean } & PostDetailResponse>(`/posts/${postId}`, payload);
  if (!data.ok) throw new Error("Failed to update post");
  return data as PostDetailResponse;
}

export async function deletePost(postId: number): Promise<void> {
  const { data } = await api.delete<{ ok: boolean; message?: string }>(`/posts/${postId}`);
  if (!data.ok) throw new Error("Failed to delete post");
}

export async function likePost(postId: number): Promise<{ liked: boolean; like_count: number }> {
  const { data } = await api.post<{ ok: boolean; liked: boolean; like_count: number }>(
    `/posts/${postId}/like`
  );
  if (!data.ok) throw new Error("Failed to update like");
  return { liked: data.liked, like_count: data.like_count };
}

export async function savePost(postId: number): Promise<{ saved: boolean }> {
  const { data } = await api.post<{ ok: boolean; saved: boolean }>(`/posts/${postId}/save`);
  if (!data.ok) throw new Error("Failed to save post");
  return { saved: data.saved };
}

export async function unsavePost(postId: number): Promise<{ saved: boolean }> {
  const { data } = await api.delete<{ ok: boolean; saved: boolean }>(`/posts/${postId}/save`);
  if (!data.ok) throw new Error("Failed to unsave post");
  return { saved: data.saved };
}

export async function addComment(
  postId: number,
  body: string,
  parentId?: number | null
): Promise<CommentItem> {
  const { data } = await api.post<{ ok: boolean } & CommentItem>(`/posts/${postId}/comments`, {
    body,
    parent_id: parentId ?? undefined
  });
  if (!data.ok) throw new Error("Failed to add comment");
  return data as CommentItem;
}

export async function getComments(
  postId: number,
  page: number,
  limit: number,
  sort: "newest" | "top" = "newest"
): Promise<CommentsResponse> {
  const { data } = await api.get<{ ok: boolean } & CommentsResponse>(`/posts/${postId}/comments`, {
    params: { page, limit, sort }
  });
  if (!data.ok) throw new Error("Failed to load comments");
  return {
    items: data.items ?? [],
    page: data.page ?? page,
    limit: data.limit ?? limit,
    total: data.total ?? 0
  };
}

export async function updateComment(
  postId: number,
  commentId: number,
  body: string
): Promise<CommentItem> {
  const { data } = await api.patch<{ ok: boolean } & CommentItem>(
    `/posts/${postId}/comments/${commentId}`,
    { body }
  );
  if (!data.ok) throw new Error("Failed to update comment");
  return data as CommentItem;
}

export async function deleteComment(postId: number, commentId: number): Promise<void> {
  const { data } = await api.delete<{ ok: boolean }>(`/posts/${postId}/comments/${commentId}`);
  if (!data.ok) throw new Error("Failed to delete comment");
}

export async function reportPost(postId: number, reason: string): Promise<{ id: number }> {
  const { data } = await api.post<{ ok: boolean; id: number }>(`/posts/${postId}/report`, { reason });
  if (!data.ok) throw new Error("Failed to report post");
  return { id: data.id };
}
