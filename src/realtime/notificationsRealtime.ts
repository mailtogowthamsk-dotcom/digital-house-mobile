import type { Socket } from "socket.io-client";
import type { NotificationItem, UnreadCounts } from "../api/notifications.api";
import { getSocket } from "./socket";
import { registerRealtimeTeardown } from "./teardown";

type NewPayload = { notification: NotificationItem; counts: UnreadCounts };

type Handlers = {
  onNew?: (payload: NewPayload) => void;
  onCounts?: (counts: UnreadCounts) => void;
};

const handlers = new Set<Handlers>();
let wired = false;
let wirePromise: Promise<void> | null = null;

let onNewEvent: ((p: NewPayload) => void) | null = null;
let onCountsEvent: ((c: UnreadCounts) => void) | null = null;

async function wire(sock: Socket) {
  if (wired) return;

  onNewEvent = (payload: NewPayload) => {
    for (const h of handlers) {
      h.onNew?.(payload);
      h.onCounts?.(payload.counts);
    }
  };
  onCountsEvent = (counts: UnreadCounts) => {
    for (const h of handlers) handlers.forEach((x) => x.onCounts?.(counts));
  };

  sock.on("notification:new", onNewEvent);
  sock.on("notification:counts", onCountsEvent);
  wired = true;
}

export function subscribeNotifications(h: Handlers): () => void {
  handlers.add(h);
  if (!wirePromise) {
    wirePromise = getSocket()
      .then((s) => wire(s))
      .finally(() => {
        wirePromise = null;
      });
  } else {
    void wirePromise;
  }
  return () => handlers.delete(h);
}

export function resetNotificationsRealtime() {
  handlers.clear();
  wired = false;
}

registerRealtimeTeardown(resetNotificationsRealtime);
