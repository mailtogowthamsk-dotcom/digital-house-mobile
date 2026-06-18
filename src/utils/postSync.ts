import type { ProfilePostItem } from "../api/profile.api";

export type PostUpdatePatch = {
  likeCount?: number;
  commentCount?: number;
  likedByMe?: boolean;
  savedByMe?: boolean;
};

export type PostSyncEvent =
  | { type: "deleted"; postId: number }
  | { type: "created"; post: ProfilePostItem }
  | { type: "updated"; postId: number; patch: PostUpdatePatch };

type PostSyncListener = (event: PostSyncEvent) => void;

const listeners = new Set<PostSyncListener>();

export function subscribePostSync(listener: PostSyncListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitPostDeleted(postId: number): void {
  listeners.forEach((fn) => fn({ type: "deleted", postId }));
}

export function emitPostCreated(post: ProfilePostItem): void {
  listeners.forEach((fn) => fn({ type: "created", post }));
}

export function emitPostUpdated(postId: number, patch: PostUpdatePatch): void {
  if (Object.keys(patch).length === 0) return;
  listeners.forEach((fn) => fn({ type: "updated", postId, patch }));
}
