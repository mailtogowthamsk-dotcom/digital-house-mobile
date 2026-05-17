import { useCallback, useRef } from "react";
import { likePost, savePost, unsavePost } from "../api/posts.api";
import { hapticLike, hapticSave } from "../utils/feedHaptics";
import { trackFeedAction } from "../utils/feedAnalytics";
import type { PostCardData } from "../components/home/PostCard";

type UpdateFn = (postId: string, patch: Partial<PostCardData>) => void;

/**
 * Optimistic like/save with rollback on failure.
 */
export function useFeedInteractions(updatePost: UpdateFn) {
  const pendingLikes = useRef(new Set<string>());

  const toggleLike = useCallback(
    async (postId: string, current: PostCardData) => {
      if (pendingLikes.current.has(postId)) return;
      pendingLikes.current.add(postId);

      const prevLiked = !!current.likedByMe;
      const prevCount = current.likeCount;
      const nextLiked = !prevLiked;

      updatePost(postId, {
        likedByMe: nextLiked,
        likeCount: Math.max(0, prevCount + (nextLiked ? 1 : -1))
      });
      void hapticLike();

      try {
        const res = await likePost(Number(postId));
        updatePost(postId, { likedByMe: res.liked, likeCount: res.like_count });
        trackFeedAction(res.liked ? "like" : "unlike", Number(postId));
      } catch {
        updatePost(postId, { likedByMe: prevLiked, likeCount: prevCount });
      } finally {
        pendingLikes.current.delete(postId);
      }
    },
    [updatePost]
  );

  const addLike = useCallback(
    async (postId: string, current: PostCardData) => {
      if (current.likedByMe || pendingLikes.current.has(postId)) return;
      pendingLikes.current.add(postId);

      updatePost(postId, { likedByMe: true, likeCount: current.likeCount + 1 });
      void hapticLike();

      try {
        let res = await likePost(Number(postId));
        if (!res.liked) res = await likePost(Number(postId));
        updatePost(postId, { likedByMe: res.liked, likeCount: res.like_count });
        trackFeedAction("like", Number(postId), { source: "double_tap" });
      } catch {
        updatePost(postId, { likedByMe: false, likeCount: current.likeCount });
      } finally {
        pendingLikes.current.delete(postId);
      }
    },
    [updatePost]
  );

  const toggleSave = useCallback(
    async (postId: string, current: PostCardData) => {
      const wasSaved = !!current.savedByMe;
      updatePost(postId, { savedByMe: !wasSaved });
      void hapticSave();
      try {
        if (wasSaved) {
          await unsavePost(Number(postId));
          trackFeedAction("unsave", Number(postId));
        } else {
          await savePost(Number(postId));
          trackFeedAction("save", Number(postId));
        }
      } catch {
        updatePost(postId, { savedByMe: wasSaved });
      }
    },
    [updatePost]
  );

  return { toggleLike, addLike, toggleSave };
}
