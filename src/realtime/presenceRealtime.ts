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
  onUpdate?: (
    userId: number,
    online: boolean,
    lastSeenAt?: string | null,
    hidden?: boolean
  ) => void;
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
/** userId → ISO last-seen (only for offline users the viewer may see). */
let lastSeenByUser: Map<number, string> = new Map();
/** Peers whose last-seen / online is hidden from this viewer. */
let hiddenUserIds: Set<number> = new Set();

/** Peer ids each mounted screen displays; the union drives `presence:subscribe`. */
const watchSets = new Map<symbol, number[]>();
/** Last watch set acknowledged by the server, so we do not resend identical sets. */
let sentWatchKey: string | null = null;

function applySnapshot(
  ids: number[],
  lastSeen?: Record<string, string>,
  hidden?: number[]
) {
  lastOnlineIds = new Set(ids.filter((n) => Number.isFinite(n) && n > 0));
  lastSeenByUser = new Map();
  hiddenUserIds = new Set();
  if (lastSeen && typeof lastSeen === "object") {
    for (const [k, v] of Object.entries(lastSeen)) {
      const uid = Number(k);
      if (uid > 0 && typeof v === "string") lastSeenByUser.set(uid, v);
    }
  }
  for (const raw of hidden ?? []) {
    const uid = Number(raw);
    if (uid > 0) {
      hiddenUserIds.add(uid);
      lastOnlineIds.delete(uid);
      lastSeenByUser.delete(uid);
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

/**
 * Merge a snapshot that only covers the peers we asked about. Users outside the
 * queried set keep their cached state instead of being treated as offline.
 */
function applyScopedSnapshot(
  queried: number[],
  onlineIds: number[],
  lastSeen?: Record<string, string>,
  hidden?: number[]
) {
  const online = new Set(onlineIds.filter((n) => Number.isFinite(n) && n > 0));
  const hiddenSet = new Set((hidden ?? []).map(Number).filter((n) => n > 0));

  for (const raw of queried) {
    const uid = Number(raw);
    if (!Number.isFinite(uid) || uid <= 0) continue;
    if (hiddenSet.has(uid)) {
      hiddenUserIds.add(uid);
      lastOnlineIds.delete(uid);
      lastSeenByUser.delete(uid);
      continue;
    }
    hiddenUserIds.delete(uid);
    if (online.has(uid)) {
      lastOnlineIds.add(uid);
      lastSeenByUser.delete(uid);
    } else {
      lastOnlineIds.delete(uid);
    }
  }

  if (lastSeen && typeof lastSeen === "object") {
    for (const [k, v] of Object.entries(lastSeen)) {
      const uid = Number(k);
      if (uid > 0 && typeof v === "string" && !lastOnlineIds.has(uid) && !hiddenUserIds.has(uid)) {
        lastSeenByUser.set(uid, v);
      }
    }
  }

  presenceSynced = true;
  for (const h of handlers) {
    h.onSnapshot?.(Array.from(lastOnlineIds));
  }
}

function watchUnion(): number[] {
  const union = new Set<number>();
  for (const ids of watchSets.values()) {
    for (const id of ids) union.add(id);
  }
  return Array.from(union).sort((a, b) => a - b);
}

/**
 * Tell the server which peers we render. Presence transitions are delivered to
 * watchers only, so this must be re-sent on every connect: a reconnected socket
 * is a new server-side socket with no rooms.
 */
function pushWatchSet(force = false) {
  const sock = socketRef ?? getSocketInstance();
  if (!sock?.connected) return;
  const ids = watchUnion();
  const key = ids.join(",");
  if (!force && key === sentWatchKey) return;
  sentWatchKey = key;
  if (__DEV__) console.log("[presence] watch", ids.length);
  sock.emit("presence:subscribe", { userIds: ids });
}

/**
 * Track the peers a screen displays. Pass null on unmount.
 * Returns nothing — presence updates arrive through `subscribePresence`.
 */
export function watchPresence(id: symbol, userIds: number[] | null): void {
  if (userIds && userIds.length > 0) {
    const normalized = userIds.map(Number).filter((n) => Number.isFinite(n) && n > 0);
    watchSets.set(id, normalized);
  } else if (!watchSets.has(id)) {
    return;
  } else {
    watchSets.delete(id);
  }
  void ensureWired();
  pushWatchSet();
}

function applyUpdate(
  userId: number,
  online: boolean,
  lastSeenAt?: string | null,
  hidden?: boolean
) {
  if (hidden) {
    lastOnlineIds.delete(userId);
    lastSeenByUser.delete(userId);
    hiddenUserIds.add(userId);
    for (const h of handlers) {
      h.onUpdate?.(userId, false, null, true);
    }
    return;
  }
  hiddenUserIds.delete(userId);
  if (online) {
    lastOnlineIds.add(userId);
    lastSeenByUser.delete(userId);
  } else {
    lastOnlineIds.delete(userId);
    if (lastSeenAt) lastSeenByUser.set(userId, lastSeenAt);
  }
  for (const h of handlers) {
    h.onUpdate?.(userId, online, lastSeenAt ?? null, false);
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
    const payload = raw as {
      userId?: number;
      online?: boolean;
      lastSeenAt?: string | null;
      hidden?: boolean;
    };
    const uid = Number(payload?.userId);
    if (!uid) return;
    if (__DEV__) {
      console.log("[presence]", payload?.hidden ? "hidden" : payload?.online ? "online" : "offline", uid);
    }
    applyUpdate(uid, !!payload?.online, payload?.lastSeenAt ?? null, !!payload?.hidden);
  };

  onSnapshotEvent = (raw: unknown) => {
    const payload = raw as {
      scoped?: boolean;
      userIds?: number[];
      onlineUserIds?: number[];
      lastSeen?: Record<string, string>;
      hiddenUserIds?: number[];
    };
    const ids = Array.isArray(payload?.onlineUserIds) ? payload.onlineUserIds.map(Number) : [];
    if (__DEV__) {
      console.log("[presence] snapshot", ids.length, payload?.scoped ? "(scoped)" : "");
    }
    if (payload?.scoped && Array.isArray(payload.userIds)) {
      applyScopedSnapshot(
        payload.userIds.map(Number),
        ids,
        payload.lastSeen,
        payload.hiddenUserIds
      );
      return;
    }
    applySnapshot(ids, payload.lastSeen, payload.hiddenUserIds);
  };

  onConnectEvent = () => {
    if (__DEV__) console.log("[presence] socket connected");
    wired = true;
    socketRef = sock;
    // A reconnect is a brand new server socket: rejoin the watch rooms before
    // re-pulling, otherwise transitions for those peers never arrive.
    sentWatchKey = null;
    pushWatchSet(true);
    requestSnapshot(sock);
  };

  onDisconnectEvent = () => {
    if (__DEV__) console.log("[presence] socket disconnected");
    wired = false;
    presenceSynced = false;
    sentWatchKey = null;
  };

  sock.on("presence:update", onUpdateEvent);
  sock.on("presence:snapshot", onSnapshotEvent);
  sock.on("connect", onConnectEvent);
  sock.on("disconnect", onDisconnectEvent);

  socketRef = sock;
  wired = sock.connected;

  if (sock.connected) {
    pushWatchSet(true);
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
              await getSocket({ waitForConnection: true });
            } catch {
              /* reconnect continues */
            }
          }
          return;
        }

        const sock = await getSocket({ waitForConnection: false });
        wireSocket(sock);
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
    pushWatchSet(true);
    requestSnapshot(sock);
    return;
  }
  void ensureWired();
}

export function isUserOnlineCached(userId: number): boolean {
  const id = Number(userId);
  if (hiddenUserIds.has(id)) return false;
  return lastOnlineIds.has(id);
}

export function getCachedOnlineUserIds(): number[] {
  return Array.from(lastOnlineIds);
}

export function getCachedLastSeenAt(userId: number): string | null {
  if (isPresenceHidden(userId) || isUserOnlineCached(userId)) return null;
  return lastSeenByUser.get(Number(userId)) ?? null;
}

export function isPresenceHidden(userId: number): boolean {
  return hiddenUserIds.has(Number(userId));
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
  sentWatchKey = null;
}

export function resetPresenceRealtime(): void {
  handlers.clear();
  watchSets.clear();
  lastOnlineIds = new Set();
  lastSeenByUser = new Map();
  hiddenUserIds = new Set();
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
