import { useEffect } from "react";
import type { MessageItem } from "../api/messages.api";
import { getSocket } from "../realtime/socket";

type ChatSocketHandlers = {
  onMessage: (message: MessageItem) => void;
  onDelivered: (payload: { messageId: number; deliveredAt: string | null }) => void;
  onRead: (payload: { withUserId: number; readAt: string }) => void;
  onTyping: (typing: boolean) => void;
  onIncomingFromOther?: (message: MessageItem, sock: import("socket.io-client").Socket) => void;
};

/**
 * Subscribe to chat socket events with correct React cleanup (avoids duplicate listeners).
 */
export function useChatSocket(
  otherUserId: number | null,
  enabled: boolean,
  handlers: ChatSocketHandlers
) {
  useEffect(() => {
    if (!enabled || otherUserId == null) return;

    let disposed = false;
    let teardown: (() => void) | null = null;

    (async () => {
      try {
        const sock = await getSocket();
        if (disposed) return;

        const isThisChat = (m: MessageItem) =>
          m.senderId === otherUserId || m.recipientId === otherUserId;

        const onNew = (raw: unknown) => {
          if (!raw || typeof raw !== "object") return;
          const m = raw as MessageItem;
          if (!isThisChat(m)) return;
          handlers.onMessage(m);
          if (m.senderId === otherUserId) {
            handlers.onIncomingFromOther?.(m, sock);
          }
        };

        const onDelivered = (p: unknown) => {
          const payload = p as { messageId?: number; deliveredAt?: string | null };
          const messageId = Number(payload?.messageId);
          if (!messageId) return;
          handlers.onDelivered({
            messageId,
            deliveredAt: payload?.deliveredAt ?? null
          });
        };

        const onRead = (p: unknown) => {
          const payload = p as { withUserId?: number; readAt?: string };
          const readAt = payload?.readAt;
          const withUserId = Number(payload?.withUserId);
          if (!readAt || withUserId !== otherUserId) return;
          handlers.onRead({ withUserId, readAt });
        };

        const onTyping = (p: unknown) => {
          const payload = p as { fromUserId?: number; typing?: boolean };
          if (Number(payload?.fromUserId) !== otherUserId) return;
          handlers.onTyping(!!payload?.typing);
        };

        sock.on("message:new", onNew);
        sock.on("message:sent", onNew);
        sock.on("message:delivered", onDelivered);
        sock.on("message:read", onRead);
        sock.on("typing", onTyping);

        teardown = () => {
          sock.off("message:new", onNew);
          sock.off("message:sent", onNew);
          sock.off("message:delivered", onDelivered);
          sock.off("message:read", onRead);
          sock.off("typing", onTyping);
        };
      } catch {
        // Not signed in or socket unavailable — chat still works via REST history
      }
    })();

    return () => {
      disposed = true;
      teardown?.();
    };
    // Handlers are expected to be stable (useCallback in parent)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherUserId, enabled]);
}
