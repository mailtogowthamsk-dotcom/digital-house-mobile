import { useEffect, useRef } from "react";
import { getSocket } from "../realtime/socket";

export type FeedRealtimeHandlers = {
  onLike?: (payload: {
    postId: number;
    likeCount: number;
    likedByUserId: number;
    liked: boolean;
  }) => void;
  onComment?: (payload: {
    postId: number;
    commentCount: number;
    commentId: number;
    userId: number;
  }) => void;
  onSave?: (payload: { postId: number; userId: number; saved: boolean }) => void;
  onNewPost?: (payload: { postId: number }) => void;
};

/** Subscribe to community feed socket events (likes, comments, saves). */
export function useFeedRealtime(handlers: FeedRealtimeHandlers): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    let disposed = false;
    let unsub: (() => void) | null = null;

    void getSocket()
      .then((s) => {
        if (disposed) return;

        const likeHandler = (p: Parameters<NonNullable<FeedRealtimeHandlers["onLike"]>>[0]) =>
          handlersRef.current.onLike?.(p);
        const commentHandler = (
          p: Parameters<NonNullable<FeedRealtimeHandlers["onComment"]>>[0]
        ) => handlersRef.current.onComment?.(p);
        const saveHandler = (p: Parameters<NonNullable<FeedRealtimeHandlers["onSave"]>>[0]) =>
          handlersRef.current.onSave?.(p);
        const newPostHandler = (p: { postId: number }) => handlersRef.current.onNewPost?.(p);

        s.on("feed:like", likeHandler);
        s.on("feed:comment", commentHandler);
        s.on("feed:save", saveHandler);
        s.on("feed:new_post", newPostHandler);

        unsub = () => {
          s.off("feed:like", likeHandler);
          s.off("feed:comment", commentHandler);
          s.off("feed:save", saveHandler);
          s.off("feed:new_post", newPostHandler);
        };
      })
      .catch(() => {
        /* offline — feed still works without realtime */
      });

    return () => {
      disposed = true;
      unsub?.();
    };
  }, []);
}
