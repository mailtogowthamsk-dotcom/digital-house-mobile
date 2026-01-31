import { api } from "./client";

// ---------------------------------------------------------------------------
// Types (match backend DTOs – snake_case)
// ---------------------------------------------------------------------------

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
};

export type CommentItem = {
  id: number;
  post_id: number;
  user_id: number;
  body: string;
  created_at: string;
  author: PostAuthor;
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

// ---------------------------------------------------------------------------
// API functions (JWT attached by client)
// ---------------------------------------------------------------------------

/** GET /api/posts/:postId */
export async function getPost(postId: number): Promise<PostDetailResponse> {
  const { data } = await api.get<{ ok: boolean } & PostDetailResponse>(`/posts/${postId}`);
  if (!data.ok) throw new Error("Failed to load post");
  return data as PostDetailResponse;
}

/** POST /api/posts */
export async function createPost(payload: CreatePostPayload): Promise<PostDetailResponse> {
  const { data } = await api.post<{ ok: boolean } & PostDetailResponse>("/posts", payload);
  if (!data.ok) throw new Error("Failed to create post");
  return data as PostDetailResponse;
}

/** PUT /api/posts/:postId */
export async function updatePost(postId: number, payload: UpdatePostPayload): Promise<PostDetailResponse> {
  const { data } = await api.put<{ ok: boolean } & PostDetailResponse>(`/posts/${postId}`, payload);
  if (!data.ok) throw new Error("Failed to update post");
  return data as PostDetailResponse;
}

/** DELETE /api/posts/:postId */
export async function deletePost(postId: number): Promise<void> {
  const { data } = await api.delete<{ ok: boolean; message?: string }>(`/posts/${postId}`);
  if (!data.ok) throw new Error("Failed to delete post");
}

/** POST /api/posts/:postId/like – toggle like */
export async function likePost(postId: number): Promise<{ liked: boolean; like_count: number }> {
  const { data } = await api.post<{ ok: boolean } & { liked: boolean; like_count: number }>(
    `/posts/${postId}/like`
  );
  if (!data.ok) throw new Error("Failed to update like");
  return { liked: (data as any).liked, like_count: (data as any).like_count };
}

/** POST /api/posts/:postId/comments */
export async function addComment(postId: number, body: string): Promise<CommentItem> {
  const { data } = await api.post<{ ok: boolean } & CommentItem>(`/posts/${postId}/comments`, { body });
  if (!data.ok) throw new Error("Failed to add comment");
  return data as CommentItem;
}

/** GET /api/posts/:postId/comments */
export async function getComments(
  postId: number,
  page: number,
  limit: number
): Promise<CommentsResponse> {
  const { data } = await api.get<{ ok: boolean } & CommentsResponse>(`/posts/${postId}/comments`, {
    params: { page, limit }
  });
  if (!data.ok) throw new Error("Failed to load comments");
  return {
    items: (data as any).items ?? [],
    page: (data as any).page ?? page,
    limit: (data as any).limit ?? limit,
    total: (data as any).total ?? 0
  };
}

/** POST /api/posts/:postId/report */
export async function reportPost(postId: number, reason: string): Promise<{ id: number }> {
  const { data } = await api.post<{ ok: boolean } & { id: number }>(`/posts/${postId}/report`, {
    reason
  });
  if (!data.ok) throw new Error("Failed to report post");
  return { id: (data as any).id };
}
