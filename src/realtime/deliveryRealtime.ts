import type { Socket } from "socket.io-client";
import { getSocket } from "./socket";
import { registerRealtimeRewire, registerRealtimeTeardown } from "./teardown";

/**
 * Device-level delivery acks: when this device receives message:new,
 * acknowledge delivery immediately (inbox open or not) — WhatsApp delivered = device received.
 */
let meId: number | null = null;
let socketRef: Socket | null = null;
let wired = false;
let wirePromise: Promise<void> | null = null;
let onNew: ((raw: unknown) => void) | null = null;
let onConnect: (() => void) | null = null;

const pendingDelivered = new Set<number>();

function ackDelivered(sock: Socket, messageId: number) {
  if (!messageId || pendingDelivered.has(messageId)) return;
  pendingDelivered.add(messageId);
  sock.emit("message:delivered", { messageId }, () => {
    pendingDelivered.delete(messageId);
  });
  setTimeout(() => pendingDelivered.delete(messageId), 15_000);
  if (__DEV__) console.log("[delivery] ack", messageId);
}

function wire(sock: Socket) {
  if (onNew) sock.off("message:new", onNew);
  if (onConnect) sock.off("connect", onConnect);

  onNew = (raw: unknown) => {
    if (!raw || typeof raw !== "object" || meId == null) return;
    const m = raw as { id?: number; recipientId?: number; deliveredAt?: string | null };
    const id = Number(m.id);
    const recipientId = Number(m.recipientId);
    if (!id || recipientId !== meId) return;
    ackDelivered(sock, id);
  };

  onConnect = () => {
    if (__DEV__) console.log("[delivery] socket connected");
    wired = true;
    socketRef = sock;
  };

  sock.on("message:new", onNew);
  sock.on("connect", onConnect);
  sock.on("disconnect", () => {
    wired = false;
  });
  socketRef = sock;
  wired = true;
}

async function ensureWired() {
  if (meId == null) return;
  if (wired && socketRef?.connected) return;
  if (!wirePromise) {
    wirePromise = (async () => {
      try {
        const sock = await getSocket({ skipRewire: true });
        wire(sock);
      } finally {
        wirePromise = null;
      }
    })();
  }
  await wirePromise;
}

/** Call once session has an approved user id. */
export function startDeliveryRealtime(userId: number): void {
  meId = Number(userId);
  void ensureWired();
}

export function stopDeliveryRealtime(): void {
  meId = null;
}

/** Ack undelivered history rows when opening a chat. */
export async function ackUndeliveredMessages(
  messages: Array<{ id: number; recipientId: number; deliveredAt: string | null }>,
  myUserId: number
): Promise<void> {
  try {
    const sock = await getSocket({ skipRewire: true });
    for (const m of messages) {
      if (Number(m.recipientId) === myUserId && !m.deliveredAt && m.id > 0) {
        ackDelivered(sock, m.id);
      }
    }
  } catch {
    // offline
  }
}

/** Unwire only — keep meId so open sessions re-attach after socket recreate. */
export function unwireDeliveryRealtime(): void {
  if (socketRef) {
    if (onNew) socketRef.off("message:new", onNew);
    if (onConnect) socketRef.off("connect", onConnect);
  }
  onNew = null;
  onConnect = null;
  socketRef = null;
  wired = false;
  wirePromise = null;
}

export function resetDeliveryRealtime(): void {
  meId = null;
  pendingDelivered.clear();
  unwireDeliveryRealtime();
}

export function ensureDeliveryRealtimeWired(): void {
  if (meId == null) return;
  wired = false;
  socketRef = null;
  void ensureWired();
}

registerRealtimeTeardown(unwireDeliveryRealtime);
registerRealtimeRewire(ensureDeliveryRealtimeWired);
