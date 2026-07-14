import type { Socket } from "socket.io-client";
import { getSocket } from "./socket";
import { registerRealtimeTeardown } from "./teardown";

type PresenceHandlers = {
  onUpdate?: (userId: number, online: boolean) => void;
  /** Full online set after connect / reconnect. */
  onSnapshot?: (onlineUserIds: number[]) => void;
};

const handlers = new Set<PresenceHandlers>();
let socketRef: Socket | null = null;
let wired = false;
let wirePromise: Promise<void> | null = null;

let onUpdateEvent: ((p: unknown) => void) | null = null;
let onSnapshotEvent: ((p: unknown) => void) | null = null;
let onConnectEvent: (() => void) | null = null;

/** Last known online set (for late subscribers). */
let lastOnlineIds: Set<number> = new Set();

function applySnapshot(ids: number[]) {
  lastOnlineIds = new Set(ids.filter((n) => Number.isFinite(n) && n > 0));
  for (const h of handlers) {
    h.onSnapshot?.(Array.from(lastOnlineIds));
  }
}

function applyUpdate(userId: number, online: boolean) {
  if (online) lastOnlineIds.add(userId);
  else lastOnlineIds.delete(userId);
  for (const h of handlers) {
    h.onUpdate?.(userId, online);
  }
}

async function wireSocket(sock: Socket): Promise<void> {
  if (onUpdateEvent) sock.off("presence:update", onUpdateEvent);
  if (onSnapshotEvent) sock.off("presence:snapshot", onSnapshotEvent);
  if (onConnectEvent) sock.off("connect", onConnectEvent);

  onUpdateEvent = (raw: unknown) => {
    const payload = raw as { userId?: number; online?: boolean };
    const uid = Number(payload?.userId);
    if (!uid) return;
    if (__DEV__) {
      console.log("[presence]", payload?.online ? "online" : "offline", uid);
    }
    applyUpdate(uid, !!payload?.online);
  };

  onSnapshotEvent = (raw: unknown) => {
    const payload = raw as { onlineUserIds?: number[] };
    const ids = Array.isArray(payload?.onlineUserIds) ? payload.onlineUserIds.map(Number) : [];
    if (__DEV__) {
      console.log("[presence] snapshot", ids.length);
    }
    applySnapshot(ids);
  };

  onConnectEvent = () => {
    if (__DEV__) console.log("[presence] socket connected");
    wired = true;
    socketRef = sock;
  };

  sock.on("presence:update", onUpdateEvent);
  sock.on("presence:snapshot", onSnapshotEvent);
  sock.on("connect", onConnectEvent);
  sock.on("disconnect", () => {
    wired = false;
  });

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

/** Ensure presence listeners are attached (call on session start / app resume). */
export function ensurePresenceRealtime(): void {
  void ensureWired();
}

export function isUserOnlineCached(userId: number): boolean {
  return lastOnlineIds.has(userId);
}

export function getCachedOnlineUserIds(): number[] {
  return Array.from(lastOnlineIds);
}

/** Shared presence bus — survives chat mount/unmount; snapshot on connect. */
export function subscribePresence(h: PresenceHandlers): () => void {
  handlers.add(h);
  void ensureWired();
  // Late subscriber: replay last snapshot if we already have one.
  if (lastOnlineIds.size > 0 && h.onSnapshot) {
    h.onSnapshot(Array.from(lastOnlineIds));
  }
  return () => {
    handlers.delete(h);
  };
}

export function resetPresenceRealtime(): void {
  handlers.clear();
  lastOnlineIds = new Set();
  if (socketRef) {
    if (onUpdateEvent) socketRef.off("presence:update", onUpdateEvent);
    if (onSnapshotEvent) socketRef.off("presence:snapshot", onSnapshotEvent);
    if (onConnectEvent) socketRef.off("connect", onConnectEvent);
  }
  onUpdateEvent = null;
  onSnapshotEvent = null;
  onConnectEvent = null;
  socketRef = null;
  wired = false;
  wirePromise = null;
}

registerRealtimeTeardown(resetPresenceRealtime);
