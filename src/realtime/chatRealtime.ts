import type { Socket } from "socket.io-client";
import type { MessageItem } from "../api/messages.api";
import { getSocket } from "./socket";
import { registerRealtimeRewire, registerRealtimeTeardown } from "./teardown";

export type MessageDeletedPayload = {
  messageId: number;
  senderId: number;
  recipientId: number;
  deleteScope: "everyone" | "me";
  deletedForUserId?: number;
  deletedAt: string;
};

export type ChatRealtimeHandlers = {
  otherUserId: number;
  onMessage: (message: MessageItem) => void;
  onDelivered: (payload: { messageId: number; deliveredAt: string | null }) => void;
  onRead: (payload: { withUserId: number; readAt: string }) => void;
  onTyping: (typing: boolean) => void;
  onDeleted?: (payload: MessageDeletedPayload) => void;
  onIncomingFromOther?: (message: MessageItem, sock: Socket) => void;
  /**
   * Socket came back after a drop. Nothing is replayed server-side, so the
   * screen must reconcile anything sent while it was offline.
   */
  onReconnect?: () => void;
};

/** Global fan-out for inbox / any-message listeners (not tied to a conversation). */
export type GlobalMessageHandler = (message: MessageItem) => void;

/** Inbox / hub: react to deletions for thread list last-message refresh. */
export type GlobalDeletedHandler = (payload: MessageDeletedPayload) => void;

type Subscription = ChatRealtimeHandlers;

const subscriptions = new Map<symbol, Subscription>();
const globalMessageHandlers = new Map<symbol, GlobalMessageHandler>();
const globalDeletedHandlers = new Map<symbol, GlobalDeletedHandler>();

let socketRef: Socket | null = null;
let wired = false;
let wirePromise: Promise<void> | null = null;
/** Set on drop so the next connect is recognised as a reconnect, not a first connect. */
let sawDisconnect = false;

let onMessageEvent: ((raw: unknown) => void) | null = null;
let onDeliveredEvent: ((p: unknown) => void) | null = null;
let onReadEvent: ((p: unknown) => void) | null = null;
let onTypingEvent: ((p: unknown) => void) | null = null;
let onDeletedEvent: ((p: unknown) => void) | null = null;
let onDisconnectEvent: (() => void) | null = null;
let onConnectEvent: (() => void) | null = null;

function isThisChat(m: MessageItem, otherUserId: number): boolean {
  const other = Number(otherUserId);
  return Number(m.senderId) === other || Number(m.recipientId) === other;
}

function forMatchingSubs(fn: (sub: Subscription) => void): void {
  for (const sub of subscriptions.values()) {
    fn(sub);
  }
}

function detachListeners(sock: Socket): void {
  if (onMessageEvent) {
    sock.off("message:new", onMessageEvent);
    sock.off("message:sent", onMessageEvent);
  }
  if (onDeliveredEvent) sock.off("message:delivered", onDeliveredEvent);
  if (onReadEvent) sock.off("message:read", onReadEvent);
  if (onTypingEvent) sock.off("typing", onTypingEvent);
  if (onDeletedEvent) sock.off("message:deleted", onDeletedEvent);
  if (onDisconnectEvent) sock.off("disconnect", onDisconnectEvent);
  if (onConnectEvent) sock.off("connect", onConnectEvent);
}

async function wireSocket(sock: Socket): Promise<void> {
  detachListeners(sock);

  onMessageEvent = (raw: unknown) => {
    if (!raw || typeof raw !== "object") return;
    const m = raw as MessageItem;
    // Normalize ids so strict equality never drops valid events
    const normalized: MessageItem = {
      ...m,
      id: Number(m.id),
      senderId: Number(m.senderId),
      recipientId: Number(m.recipientId),
      sharedPostId:
        (m as MessageItem).sharedPostId != null
          ? Number((m as MessageItem).sharedPostId)
          : null
    };
    if (!normalized.id || !normalized.senderId || !normalized.recipientId) return;

    if (__DEV__) {
      console.log("[chat] message", normalized.id, normalized.senderId, "→", normalized.recipientId);
    }

    for (const handler of globalMessageHandlers.values()) {
      try {
        handler(normalized);
      } catch {
        /* ignore handler errors */
      }
    }

    forMatchingSubs((sub) => {
      if (!isThisChat(normalized, sub.otherUserId)) return;
      sub.onMessage(normalized);
      if (Number(normalized.senderId) === Number(sub.otherUserId)) {
        sub.onIncomingFromOther?.(normalized, sock);
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
      if (withUserId === Number(sub.otherUserId)) {
        sub.onRead({ withUserId, readAt });
      }
    });
  };

  onTypingEvent = (p: unknown) => {
    const payload = p as { fromUserId?: number; typing?: boolean };
    const fromUserId = Number(payload?.fromUserId);
    if (!fromUserId) return;
    forMatchingSubs((sub) => {
      if (fromUserId === Number(sub.otherUserId)) {
        sub.onTyping(!!payload?.typing);
      }
    });
  };

  onDeletedEvent = (p: unknown) => {
    if (!p || typeof p !== "object") return;
    const raw = p as MessageDeletedPayload;
    const messageId = Number(raw.messageId);
    const senderId = Number(raw.senderId);
    const recipientId = Number(raw.recipientId);
    if (!messageId || !senderId || !recipientId) return;
    const deleteScope = raw.deleteScope === "me" ? "me" : "everyone";
    const normalized: MessageDeletedPayload = {
      messageId,
      senderId,
      recipientId,
      deleteScope,
      deletedForUserId:
        raw.deletedForUserId != null ? Number(raw.deletedForUserId) : undefined,
      deletedAt: typeof raw.deletedAt === "string" ? raw.deletedAt : ""
    };

    if (__DEV__) {
      console.log("[chat] deleted", normalized.messageId, normalized.deleteScope);
    }

    for (const handler of globalDeletedHandlers.values()) {
      try {
        handler(normalized);
      } catch {
        /* ignore */
      }
    }

    forMatchingSubs((sub) => {
      const other = Number(sub.otherUserId);
      if (senderId !== other && recipientId !== other) return;
      sub.onDeleted?.(normalized);
    });
  };

  onDisconnectEvent = () => {
    if (__DEV__) console.log("[chat] socket disconnected");
    wired = false;
    sawDisconnect = true;
  };

  onConnectEvent = () => {
    if (__DEV__) console.log("[chat] socket reconnected");
    wired = true;
    socketRef = sock;
    // Only after a real drop: a first connect has nothing to reconcile.
    if (!sawDisconnect) return;
    sawDisconnect = false;
    forMatchingSubs((sub) => sub.onReconnect?.());
  };

  sock.on("message:new", onMessageEvent);
  sock.on("message:sent", onMessageEvent);
  sock.on("message:delivered", onDeliveredEvent);
  sock.on("message:read", onReadEvent);
  sock.on("typing", onTypingEvent);
  sock.on("message:deleted", onDeletedEvent);
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
        const sock = await getSocket({ waitForConnection: false });
        await wireSocket(sock);
      } catch (e) {
        if (__DEV__) console.warn("[chat] ensureWired failed", e);
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
    subscriptions.set(id, {
      ...handlers,
      otherUserId: Number(handlers.otherUserId)
    });
    void ensureWired();
  } else {
    subscriptions.delete(id);
  }
}

/** Inbox / hub: receive all message:new / message:sent events. */
export function registerGlobalMessageHandler(
  id: symbol,
  handler: GlobalMessageHandler | null
): void {
  if (handler) {
    globalMessageHandlers.set(id, handler);
    void ensureWired();
  } else {
    globalMessageHandlers.delete(id);
  }
}

/** Inbox / hub: receive message:deleted (everyone scope or this user's me-scope). */
export function registerGlobalDeletedHandler(
  id: symbol,
  handler: GlobalDeletedHandler | null
): void {
  if (handler) {
    globalDeletedHandlers.set(id, handler);
    void ensureWired();
  } else {
    globalDeletedHandlers.delete(id);
  }
}

/**
 * Detach socket listeners only — keep subscriptions so an open ChatScreen
 * can re-wire after token refresh / socket recreate without remounting.
 */
export function unwireChatRealtime(): void {
  if (socketRef) {
    detachListeners(socketRef);
  }
  onMessageEvent = null;
  onDeliveredEvent = null;
  onReadEvent = null;
  onTypingEvent = null;
  onDeletedEvent = null;
  onDisconnectEvent = null;
  onConnectEvent = null;
  socketRef = null;
  wired = false;
  wirePromise = null;
}

/** Full reset (logout). */
export function resetChatRealtime(): void {
  subscriptions.clear();
  globalMessageHandlers.clear();
  globalDeletedHandlers.clear();
  sawDisconnect = false;
  unwireChatRealtime();
}

/** Re-attach listeners after getSocket() creates/restores a connection. */
export function ensureChatRealtimeWired(): void {
  if (
    subscriptions.size === 0 &&
    globalMessageHandlers.size === 0 &&
    globalDeletedHandlers.size === 0
  ) {
    return;
  }
  wired = false;
  socketRef = null;
  void ensureWired();
}

registerRealtimeTeardown(unwireChatRealtime);
registerRealtimeRewire(ensureChatRealtimeWired);
