/**
 * Queue a chat send over socket with REST fallback.
 * Optimistic UI is caller's responsibility; this returns the server MessageItem on success.
 */
import type { Socket } from "socket.io-client";
import type { MessageItem } from "../api/messages.api";
import { sendMessage as sendMessageRest } from "../api/messages.api";
import { getSocket } from "./socket";

type SendArgs = {
  senderId: number;
  recipientId: number;
  body: string;
  clientId: string;
};

type AckResp = {
  ok?: boolean;
  error?: string;
  messageId?: number;
  message?: MessageItem;
};

const ACK_MS = 6_000;

export async function sendChatMessage(args: SendArgs): Promise<MessageItem> {
  const { senderId, recipientId, body, clientId } = args;

  const restSend = () => sendMessageRest(recipientId, body, clientId);

  try {
    const sock = await getSocket();
    if (!sock.connected) {
      return await restSend();
    }

    const viaSocket = await new Promise<MessageItem | "rejected" | null>((resolve) => {
      const timer = setTimeout(() => resolve(null), ACK_MS);

      sock.emit(
        "message:send",
        { recipientId, body, clientId },
        (resp: AckResp) => {
          clearTimeout(timer);
          if (resp?.ok && resp.message && typeof resp.message === "object" && resp.message.id) {
            if (__DEV__) console.log("[send] socket ack", resp.message.id);
            resolve(resp.message);
            return;
          }
          if (resp?.ok && resp.messageId) {
            if (__DEV__) console.log("[send] socket ack id", resp.messageId);
            resolve({
              id: resp.messageId,
              senderId,
              recipientId,
              body,
              clientId,
              deliveredAt: null,
              readAt: null,
              createdAt: new Date().toISOString()
            });
            return;
          }
          if (__DEV__) console.log("[send] socket rejected", resp?.error);
          resolve("rejected");
        }
      );
    });

    if (viaSocket && viaSocket !== "rejected") {
      return viaSocket;
    }

    if (__DEV__) console.log("[send] REST fallback");
    return await restSend();
  } catch {
    return await restSend();
  }
}

/** Fire typing without blocking the UI. */
export function emitTypingEvent(sock: Socket | null, toUserId: number, typing: boolean): void {
  if (!sock?.connected) return;
  sock.emit("typing", { toUserId, typing });
}
