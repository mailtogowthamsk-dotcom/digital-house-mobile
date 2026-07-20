/**
 * Centralized online presence bus.
 *
 * Critical: listeners must attach BEFORE connect settles, then emit
 * `presence:request` so we never miss the server snapshot.
 */

import type { Socket } from "socket.io-client";
import { getSocket, getSocketInstance } from "./socket";
import { registerRealtimeRewire, registerRealtimeTeardown } from "./teardown";

type PresenceHandlers = {
  onUpdate?: (userId: number, online: boolean, lastSeenAt?: string | null) => void;
  /** Full online set after connect / reconnect / request. */
  onSnapshot?: (onlineUserIds: number[]) => void;
};

const handlers = new Set<PresenceHandlers>();
let socketRef: Socket | null = null;
let wired = false;
let wirePromise: Promise<void> | null = null;
/** True after at least one successful snapshot this session. */
let presenceSynced = false;

let onUpdateEvent: ((p: unknown) => void) | null = null;
let onSnapshotEvent: ((p: unknown) => void) | null = null;
let onConnectEvent: (() => void) | null = null;
let onDisconnectEvent: (() => void) | null = null;

/** Last known online set (for late subscribers). */
let lastOnlineIds: Set<number> = new Set();
/** userId → ISO last-seen (only for offline users). */
let lastSeenByUser: Map<number, string> = new Map();

function applySnapshot(ids: number[], lastSeen?: Record<string, string>) {
  lastOnlineIds = new Set(ids.filter((n) => Number.isFinite(n) && n > 0));
  if (lastSeen && typeof lastSeen === "object") {
    lastSeenByUser = new Map();
    for (const [k, v] of Object.entries(lastSeen)) {
      const uid = Number(k);
      if (uid > 0 && typeof v === "string") lastSeenByUser.set(uid, v);
    }
  }
  for (const uid of lastOnlineIds) {
    lastSeenByUser.delete(uid);
  }
  presenceSynced = true;
  for (const h of handlers) {
    h.onSnapshot?.(Array.from(lastOnlineIds));
  }
}

function applyUpdate(userId: number, online: boolean, lastSeenAt?: string | null) {
  if (online) {
    lastOnlineIds.add(userId);
    lastSeenByUser.delete(userId);
  } else {
    lastOnlineIds.delete(userId);
    if (lastSeenAt) lastSeenByUser.set(userId, lastSeenAt);
  }
  for (const h of handlers) {
    h.onUpdate?.(userId, online, lastSeenAt ?? null);
  }
}

function requestSnapshot(sock: Socket) {
  if (!sock.connected) return;
  if (__DEV__) console.log("[presence] request snapshot");
  sock.emit("presence:request");
}

function wireSocket(sock: Socket): void {
  if (onUpdateEvent) sock.off("presence:update", onUpdateEvent);
  if (onSnapshotEvent) sock.off("presence:snapshot", onSnapshotEvent);
  if (onConnectEvent) sock.off("connect", onConnectEvent);
  if (onDisconnectEvent) sock.off("disconnect", onDisconnectEvent);

  onUpdateEvent = (raw: unknown) => {
    const payload = raw as { userId?: number; online?: boolean; lastSeenAt?: string | null };
    const uid = Number(payload?.userId);
    if (!uid) return;
    if (__DEV__) {
      console.log("[presence]", payload?.online ? "online" : "offline", uid);
    }
    applyUpdate(uid, !!payload?.online, payload?.lastSeenAt ?? null);
  };

  onSnapshotEvent = (raw: unknown) => {
    const payload = raw as { onlineUserIds?: number[]; lastSeen?: Record<string, string> };
    const ids = Array.isArray(payload?.onlineUserIds) ? payload.onlineUserIds.map(Number) : [];
    if (__DEV__) {
      console.log("[presence] snapshot", ids.length);
    }
    applySnapshot(ids, payload?.lastSeen);
  };

  onConnectEvent = () => {
    if (__DEV__) console.log("[presence] socket connected");
    wired = true;
    socketRef = sock;
    // Always re-pull after connect — covers handshake race + reconnects.
    requestSnapshot(sock);
  };

  onDisconnectEvent = () => {
    if (__DEV__) console.log("[presence] socket disconnected");
    wired = false;
    presenceSynced = false;
  };

  sock.on("presence:update", onUpdateEvent);
  sock.on("presence:snapshot", onSnapshotEvent);
  sock.on("connect", onConnectEvent);
  sock.on("disconnect", onDisconnectEvent);

  socketRef = sock;
  wired = sock.connected;

  if (sock.connected) {
    requestSnapshot(sock);
  }
}

async function ensureWired(): Promise<void> {
  if (wired && socketRef?.connected && presenceSynced) return;
  if (!wirePromise) {
    wirePromise = (async () => {
      try {
        const existing = getSocketInstance();
        if (existing) {
          wireSocket(existing);
          if (!existing.connected) {
            try {
              await getSocket({ skipRewire: true, waitForConnection: true });
            } catch {
              /* reconnect continues */
            }
            if (existing.connected) requestSnapshot(existing);
          }
          return;
        }

        const sock = await getSocket({ skipRewire: true, waitForConnection: false });
        wireSocket(sock);
        if (!sock.connected) {
          try {
            await getSocket({ skipRewire: true, waitForConnection: true });
          } catch {
            /* reconnect continues */
          }
          if (sock.connected) requestSnapshot(sock);
        }
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

/** Force a fresh snapshot from the server (foreground resume). */
export function refreshPresenceSnapshot(): void {
  const sock = socketRef ?? getSocketInstance();
  if (sock?.connected) {
    requestSnapshot(sock);
    return;
  }
  void ensureWired();
}

export function isUserOnlineCached(userId: number): boolean {
  return lastOnlineIds.has(Number(userId));
}

export function getCachedOnlineUserIds(): number[] {
  return Array.from(lastOnlineIds);
}

export function getCachedLastSeenAt(userId: number): string | null {
  if (isUserOnlineCached(userId)) return null;
  return lastSeenByUser.get(Number(userId)) ?? null;
}

export function hasPresenceSynced(): boolean {
  return presenceSynced;
}

/**
 * Format last-seen for UI (architecture ready).
 * Examples: "just now", "2 minutes ago", "yesterday", "Jan 12"
 */
export function formatLastSeen(iso: string | null | undefined, now = Date.now()): string | null {
  if (!iso) return null;
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return null;
  const diffSec = Math.max(0, Math.floor((now - ts) / 1000));
  if (diffSec < 45) return "just now";
  if (diffSec < 90) return "1 minute ago";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} minutes ago`;
  if (diffSec < 5400) return "1 hour ago";
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;

  const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = dayStart(new Date(now));
  const thatDay = dayStart(new Date(ts));
  const dayDiff = Math.round((today - thatDay) / 86400000);
  if (dayDiff === 1) return "yesterday";
  if (dayDiff < 7) {
    return new Date(ts).toLocaleDateString(undefined, { weekday: "long" });
  }
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Shared presence bus — survives chat mount/unmount; snapshot on connect. */
export function subscribePresence(h: PresenceHandlers): () => void {
  handlers.add(h);
  void ensureWired();
  if (presenceSynced && h.onSnapshot) {
    h.onSnapshot(Array.from(lastOnlineIds));
  } else if (lastOnlineIds.size > 0 && h.onSnapshot) {
    h.onSnapshot(Array.from(lastOnlineIds));
  }
  return () => {
    handlers.delete(h);
  };
}

/** Unwire only — keep presence handler subscriptions + cache. */
export function unwirePresenceRealtime(): void {
  if (socketRef) {
    if (onUpdateEvent) socketRef.off("presence:update", onUpdateEvent);
    if (onSnapshotEvent) socketRef.off("presence:snapshot", onSnapshotEvent);
    if (onConnectEvent) socketRef.off("connect", onConnectEvent);
    if (onDisconnectEvent) socketRef.off("disconnect", onDisconnectEvent);
  }
  onUpdateEvent = null;
  onSnapshotEvent = null;
  onConnectEvent = null;
  onDisconnectEvent = null;
  socketRef = null;
  wired = false;
  wirePromise = null;
  presenceSynced = false;
}

export function resetPresenceRealtime(): void {
  handlers.clear();
  lastOnlineIds = new Set();
  lastSeenByUser = new Map();
  unwirePresenceRealtime();
}

/**
 * Re-attach after socket recreate. Sync-wires when the socket instance already
 * exists so getSocket can attach listeners before waitForConnect.
 */
export function ensurePresenceRealtimeWired(): void {
  wired = false;
  socketRef = null;
  presenceSynced = false;
  const existing = getSocketInstance();
  if (existing) {
    wireSocket(existing);
    return;
  }
  void ensureWired();
}

registerRealtimeTeardown(unwirePresenceRealtime);
registerRealtimeRewire(ensurePresenceRealtimeWired);
