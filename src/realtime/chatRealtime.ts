import type { Socket } from "socket.io-client";
import type { MessageItem } from "../api/messages.api";
import { getSocket } from "./socket";
import { registerRealtimeTeardown } from "./teardown";

export type ChatRealtimeHandlers = {
  otherUserId: number;
  onMessage: (message: MessageItem) => void;
  onDelivered: (payload: { messageId: number; deliveredAt: string | null }) => void;
  onRead: (payload: { withUserId: number; readAt: string }) => void;
  onTyping: (typing: boolean) => void;
  onIncomingFromOther?: (message: MessageItem, sock: Socket) => void;
};

type Subscription = ChatRealtimeHandlers;

const subscriptions = new Map<symbol, Subscription>();
let socketRef: Socket | null = null;
let wired = false;
let wirePromise: Promise<void> | null = null;

let onMessageEvent: ((raw: unknown) => void) | null = null;
let onDeliveredEvent: ((p: unknown) => void) | null = null;
let onReadEvent: ((p: unknown) => void) | null = null;
let onTypingEvent: ((p: unknown) => void) | null = null;
let onDisconnectEvent: (() => void) | null = null;
let onConnectEvent: (() => void) | null = null;

function isThisChat(m: MessageItem, otherUserId: number): boolean {
  return m.senderId === otherUserId || m.recipientId === otherUserId;
}

function forMatchingSubs(fn: (sub: Subscription) => void): void {
  for (const sub of subscriptions.values()) {
    fn(sub);
  }
}

async function wireSocket(sock: Socket): Promise<void> {
  if (onMessageEvent) {
    sock.off("message:new", onMessageEvent);
    sock.off("message:sent", onMessageEvent);
  }
  if (onDeliveredEvent) sock.off("message:delivered", onDeliveredEvent);
  if (onReadEvent) sock.off("message:read", onReadEvent);
  if (onTypingEvent) sock.off("typing", onTypingEvent);
  if (onDisconnectEvent) sock.off("disconnect", onDisconnectEvent);
  if (onConnectEvent) sock.off("connect", onConnectEvent);

  onMessageEvent = (raw: unknown) => {
    if (!raw || typeof raw !== "object") return;
    const m = raw as MessageItem;
    if (__DEV__) console.log("[chat] message", m.id, m.senderId, "→", m.recipientId);
    forMatchingSubs((sub) => {
      if (!isThisChat(m, sub.otherUserId)) return;
      sub.onMessage(m);
      if (m.senderId === sub.otherUserId) {
        sub.onIncomingFromOther?.(m, sock);
      }
    });
  };

  onDeliveredEvent = (p: unknown) => {
    const payload = p as { messageId?: number; deliveredAt?: string | null };
    const messageId = Number(payload?.messageId);
    if (!messageId) return;
    if (__DEV__) console.log("[chat] delivered", messageId);
    const normalized = { messageId, deliveredAt: payload?.deliveredAt ?? null };
    forMatchingSubs((sub) => sub.onDelivered(normalized));
  };

  onReadEvent = (p: unknown) => {
    const payload = p as { withUserId?: number; readAt?: string };
    const readAt = payload?.readAt;
    const withUserId = Number(payload?.withUserId);
    if (!readAt || !withUserId) return;
    if (__DEV__) console.log("[chat] read", withUserId);
    forMatchingSubs((sub) => {
      if (withUserId === sub.otherUserId) {
        sub.onRead({ withUserId, readAt });
      }
    });
  };

  onTypingEvent = (p: unknown) => {
    const payload = p as { fromUserId?: number; typing?: boolean };
    const fromUserId = Number(payload?.fromUserId);
    if (!fromUserId) return;
    forMatchingSubs((sub) => {
      if (fromUserId === sub.otherUserId) {
        sub.onTyping(!!payload?.typing);
      }
    });
  };

  onDisconnectEvent = () => {
    if (__DEV__) console.log("[chat] socket disconnected");
    wired = false;
  };

  onConnectEvent = () => {
    if (__DEV__) console.log("[chat] socket reconnected");
    wired = true;
    socketRef = sock;
  };

  sock.on("message:new", onMessageEvent);
  sock.on("message:sent", onMessageEvent);
  sock.on("message:delivered", onDeliveredEvent);
  sock.on("message:read", onReadEvent);
  sock.on("typing", onTypingEvent);
  sock.on("disconnect", onDisconnectEvent);
  sock.on("connect", onConnectEvent);

  socketRef = sock;
  wired = true;
}

async function ensureWired(): Promise<void> {
  if (wired && socketRef?.connected) return;
  if (!wirePromise) {
    wirePromise = (async () => {
      try {
        const sock = await getSocket();
        await wireSocket(sock);
      } finally {
        wirePromise = null;
      }
    })();
  }
  await wirePromise;
}

/** Register active chat handlers (survives loading states; single global socket listener). */
export function registerChatRealtime(id: symbol, handlers: Subscription | null): void {
  if (handlers) {
    subscriptions.set(id, handlers);
    void ensureWired();
  } else {
    subscriptions.delete(id);
  }
}

export function resetChatRealtime(): void {
  subscriptions.clear();
  if (socketRef) {
    if (onMessageEvent) {
      socketRef.off("message:new", onMessageEvent);
      socketRef.off("message:sent", onMessageEvent);
    }
    if (onDeliveredEvent) socketRef.off("message:delivered", onDeliveredEvent);
    if (onReadEvent) socketRef.off("message:read", onReadEvent);
    if (onTypingEvent) socketRef.off("typing", onTypingEvent);
    if (onDisconnectEvent) socketRef.off("disconnect", onDisconnectEvent);
    if (onConnectEvent) socketRef.off("connect", onConnectEvent);
  }
  onMessageEvent = null;
  onDeliveredEvent = null;
  onReadEvent = null;
  onTypingEvent = null;
  onDisconnectEvent = null;
  onConnectEvent = null;
  socketRef = null;
  wired = false;
  wirePromise = null;
}

registerRealtimeTeardown(resetChatRealtime);
