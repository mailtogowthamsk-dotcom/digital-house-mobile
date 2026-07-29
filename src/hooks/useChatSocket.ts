import { useEffect, useRef } from "react";
import type { MessageItem } from "../api/messages.api";
import type { Socket } from "socket.io-client";
import { registerChatRealtime } from "../realtime/chatRealtime";

type ChatSocketHandlers = {
  onMessage: (message: MessageItem) => void;
  onDelivered: (payload: { messageId: number; deliveredAt: string | null }) => void;
  onRead: (payload: { withUserId: number; readAt: string }) => void;
  onTyping: (typing: boolean) => void;
  onIncomingFromOther?: (message: MessageItem, sock: Socket) => void;
  /** Socket recovered after a drop — reconcile anything missed while offline. */
  onReconnect?: () => void;
};

/**
 * Subscribe to chat realtime for an active conversation while the screen is mounted.
 * Do not gate on navigation focus — blur would drop live messages.
 * Callers should gate mark-read / UI chrome on focus separately.
 */
export function useChatSocket(
  otherUserId: number | null,
  enabled: boolean,
  handlers: ChatSocketHandlers
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const subIdRef = useRef(Symbol("chat-sub"));

  useEffect(() => {
    if (!enabled || otherUserId == null) {
      registerChatRealtime(subIdRef.current, null);
      return;
    }

    registerChatRealtime(subIdRef.current, {
      otherUserId: Number(otherUserId),
      onMessage: (m) => handlersRef.current.onMessage(m),
      onDelivered: (p) => handlersRef.current.onDelivered(p),
      onRead: (p) => handlersRef.current.onRead(p),
      onTyping: (t) => handlersRef.current.onTyping(t),
      onIncomingFromOther: (m, sock) => handlersRef.current.onIncomingFromOther?.(m, sock),
      onReconnect: () => handlersRef.current.onReconnect?.()
    });

    return () => registerChatRealtime(subIdRef.current, null);
  }, [otherUserId, enabled]);
}
