import { useEffect } from "react";
import type { Socket } from "socket.io-client";
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
  useEffect(() => {
    let socket: Socket | null = null;
    let unsub: (() => void) | null = null;

    void getSocket().then((s) => {
      socket = s;
      const likeHandler = (p: Parameters<NonNullable<FeedRealtimeHandlers["onLike"]>>[0]) =>
        handlers.onLike?.(p);
      const commentHandler = (p: Parameters<NonNullable<FeedRealtimeHandlers["onComment"]>>[0]) =>
        handlers.onComment?.(p);
      const saveHandler = (p: Parameters<NonNullable<FeedRealtimeHandlers["onSave"]>>[0]) =>
        handlers.onSave?.(p);
      const newPostHandler = (p: { postId: number }) => handlers.onNewPost?.(p);

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
    });

    return () => {
      unsub?.();
    };
  }, [handlers]);
}
