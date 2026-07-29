import type { Socket } from "socket.io-client";
import type { NotificationItem, UnreadCounts } from "../api/notifications.api";
import { getSocket, getSocketInstance } from "./socket";
import { registerRealtimeRewire, registerRealtimeTeardown } from "./teardown";

type NewPayload = { notification: NotificationItem; counts: UnreadCounts };

type Handlers = {
  onNew?: (payload: NewPayload) => void;
  onCounts?: (counts: UnreadCounts) => void;
};

const handlers = new Set<Handlers>();
let socketRef: Socket | null = null;
let wired = false;
let wirePromise: Promise<void> | null = null;

let onNewEvent: ((p: NewPayload) => void) | null = null;
let onCountsEvent: ((c: UnreadCounts) => void) | null = null;

function detachListeners(sock: Socket): void {
  if (onNewEvent) sock.off("notification:new", onNewEvent);
  if (onCountsEvent) sock.off("notification:counts", onCountsEvent);
}

function wireSocket(sock: Socket): void {
  detachListeners(sock);

  onNewEvent = (payload: NewPayload) => {
    for (const h of handlers) {
      h.onNew?.(payload);
      h.onCounts?.(payload.counts);
    }
  };

  onCountsEvent = (counts: UnreadCounts) => {
    for (const h of handlers) h.onCounts?.(counts);
  };

  sock.on("notification:new", onNewEvent);
  sock.on("notification:counts", onCountsEvent);

  socketRef = sock;
  wired = true;
}

async function ensureWired(): Promise<void> {
  if (handlers.size === 0) return;
  if (wired && socketRef?.connected) return;
  if (!wirePromise) {
    wirePromise = (async () => {
      try {
        const sock = await getSocket({ waitForConnection: false });
        wireSocket(sock);
      } catch {
        // Signed out or offline; the socket rewire hook retries on connect.
      } finally {
        wirePromise = null;
      }
    })();
  }
  await wirePromise;
}

export function subscribeNotifications(h: Handlers): () => void {
  handlers.add(h);
  const existing = getSocketInstance();
  if (existing && !wired) {
    wireSocket(existing);
  } else {
    void ensureWired();
  }
  return () => {
    handlers.delete(h);
  };
}

/** Detach listeners but keep subscribers so mounted screens re-arm on reconnect. */
export function unwireNotificationsRealtime(): void {
  if (socketRef) detachListeners(socketRef);
  onNewEvent = null;
  onCountsEvent = null;
  socketRef = null;
  wired = false;
  wirePromise = null;
}

/** Full reset (logout). */
export function resetNotificationsRealtime(): void {
  handlers.clear();
  unwireNotificationsRealtime();
}

function ensureNotificationsRealtimeWired(): void {
  if (handlers.size === 0) return;
  wired = false;
  socketRef = null;
  const existing = getSocketInstance();
  if (existing) {
    wireSocket(existing);
    return;
  }
  void ensureWired();
}

registerRealtimeTeardown(unwireNotificationsRealtime);
registerRealtimeRewire(ensureNotificationsRealtimeWired);
