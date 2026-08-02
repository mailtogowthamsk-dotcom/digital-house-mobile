/**
 * Feed row wrapper — keeps PostCard memo effective.
 * Parent passes stable post refs + separate media flags; actions live in a ref
 * so renderItem does not recreate per-row closures on every parent state tick.
 */

import React, { memo, useCallback, type MutableRefObject } from "react";
import { PostCard, type PostCardData } from "./PostCard";

export type FeedPostCardActions = {
  onAuthorPress: (item: PostCardData) => void;
  /** When omitted or returns false for item, menu is hidden. */
  onMenuPress?: (item: PostCardData) => void;
  shouldShowMenu?: (item: PostCardData) => boolean;
  onDoubleTap: (item: PostCardData) => void;
  onLikePress: (item: PostCardData) => void;
  onLikeCountPress: (item: PostCardData) => void;
  onCommentPress: (item: PostCardData) => void;
  onSavePress: (item: PostCardData) => void;
  onSharePress: (item: PostCardData) => void;
  onActivateMedia?: (postId: string) => void;
  onViewJob?: (item: PostCardData) => void;
};

type Props = {
  post: PostCardData;
  isMediaActive: boolean;
  isMediaPreload: boolean;
  isMediaRetain?: boolean;
  actionsRef: MutableRefObject<FeedPostCardActions>;
};

function FeedPostCardRowInner({
  post,
  isMediaActive,
  isMediaPreload,
  isMediaRetain = false,
  actionsRef
}: Props) {
  const onAuthorPress = useCallback(() => {
    actionsRef.current.onAuthorPress(post);
  }, [actionsRef, post]);

  const showMenu = actionsRef.current.shouldShowMenu
    ? actionsRef.current.shouldShowMenu(post)
    : Boolean(actionsRef.current.onMenuPress);

  const onMenuPress = useCallback(() => {
    actionsRef.current.onMenuPress?.(post);
  }, [actionsRef, post]);

  const onDoubleTap = useCallback(() => {
    actionsRef.current.onDoubleTap(post);
  }, [actionsRef, post]);

  const onLikePress = useCallback(() => {
    actionsRef.current.onLikePress(post);
  }, [actionsRef, post]);

  const onLikeCountPress = useCallback(() => {
    actionsRef.current.onLikeCountPress(post);
  }, [actionsRef, post]);

  const onCommentPress = useCallback(() => {
    actionsRef.current.onCommentPress(post);
  }, [actionsRef, post]);

  const onSavePress = useCallback(() => {
    actionsRef.current.onSavePress(post);
  }, [actionsRef, post]);

  const onSharePress = useCallback(() => {
    actionsRef.current.onSharePress(post);
  }, [actionsRef, post]);

  const onViewJob = useCallback(() => {
    actionsRef.current.onViewJob?.(post);
  }, [actionsRef, post]);

  const onActivateMedia = useCallback(
    (postId: string) => {
      actionsRef.current.onActivateMedia?.(postId);
    },
    [actionsRef]
  );

  return (
    <PostCard
      post={post}
      isMediaActive={isMediaActive}
      isMediaPreload={isMediaPreload}
      isMediaRetain={isMediaRetain}
      onAuthorPress={onAuthorPress}
      onMenuPress={showMenu ? onMenuPress : undefined}
      onDoubleTap={onDoubleTap}
      onLikePress={onLikePress}
      onLikeCountPress={onLikeCountPress}
      onCommentPress={onCommentPress}
      onSavePress={onSavePress}
      onSharePress={onSharePress}
      onViewJob={
        (post.postType || "").toLowerCase() === "job" ? onViewJob : undefined
      }
      onActivateMedia={onActivateMedia}
    />
  );
}

function propsEqual(prev: Props, next: Props): boolean {
  return (
    prev.post === next.post &&
    prev.isMediaActive === next.isMediaActive &&
    prev.isMediaPreload === next.isMediaPreload &&
    Boolean(prev.isMediaRetain) === Boolean(next.isMediaRetain) &&
    prev.actionsRef === next.actionsRef
  );
}

export const FeedPostCardRow = memo(FeedPostCardRowInner, propsEqual);
