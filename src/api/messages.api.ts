import { api } from "./client";
import {
  CacheKeys,
  cachedGet,
  invalidateRequestCacheMatching
} from "./requestCache";

export type ChatLane = "community" | "matrimony" | "business";

export type LaneAccess = {
  applicable: boolean;
  allowed: boolean;
  readOnly: boolean;
  code?: string;
  message?: string;
};

export type Thread = {
  otherUser: { id: number; name: string; profileImage: string | null; online: boolean };
  chatLanes?: ChatLane[];
  primaryLane?: ChatLane | null;
  /** Absent on older servers — callers must fall back to lane inspection. */
  canSend?: boolean;
  muted?: boolean;
  archived?: boolean;
  left?: boolean;
  lastMessage: {
    id: number;
    senderId: number;
    recipientId: number;
    body: string;
    createdAt: string;
    deliveredAt: string | null;
    readAt: string | null;
  } | null;
  unreadCount: number;
};

export type MessageItem = {
  id: number;
  senderId: number;
  recipientId: number;
  body: string;
  sharedPostId?: number | null;
  sharedStoryId?: number | null;
  clientId: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
};

export type MessageAccess = {
  allowed: boolean;
  canViewHistory: boolean;
  readOnly: boolean;
  communityChat?: LaneAccess;
  matrimonyChat?: LaneAccess;
  businessChat?: LaneAccess;
  primaryLane?: ChatLane | null;
  chatLanes?: ChatLane[];
  code?: string;
  message?: string;
  reason?: "matrimony_match" | "connection" | "business" | "legacy_thread" | "blocked" | "no_permission";
};

export async function getMessageAccess(otherUserId: number): Promise<MessageAccess> {
  const res = await api.get<{ ok: true; access: MessageAccess }>(`/messages/access/${otherUserId}`);
  return res.data.access;
}

const THREADS_TTL_MS = 45_000;
const THREADS_PAGE_SIZE = 25;

function threadsCacheKey(opts?: {
  includeArchived?: boolean;
  archivedOnly?: boolean;
  cursorId?: number;
}): string {
  const base = opts?.archivedOnly
    ? CacheKeys.threadsArchived
    : opts?.includeArchived
      ? CacheKeys.threadsIncludeArchived
      : CacheKeys.threadsInbox;
  // Only cache the first page — pagination pages must always hit network.
  if (opts?.cursorId) return `${base}:p:${opts.cursorId}`;
  return base;
}

export type ThreadListPage = {
  threads: Thread[];
  nextCursorId: number | null;
};

export async function listThreads(
  opts?: {
    includeArchived?: boolean;
    archivedOnly?: boolean;
    force?: boolean;
    limit?: number;
    cursorId?: number;
  }
): Promise<ThreadListPage> {
  const { force, limit, cursorId, ...query } = opts ?? {};
  const pageLimit = limit ?? THREADS_PAGE_SIZE;
  const isFirstPage = cursorId == null;
  const run = async (): Promise<ThreadListPage> => {
    const res = await api.get<{
      ok: true;
      threads: Thread[];
      nextCursorId?: number | null;
    }>("/messages/threads", {
      params: {
        limit: pageLimit,
        ...(cursorId != null ? { cursorId } : {}),
        ...(query.includeArchived ? { includeArchived: "1" } : {}),
        ...(query.archivedOnly ? { archivedOnly: "1" } : {})
      }
    });
    return {
      threads: res.data.threads ?? [],
      nextCursorId: res.data.nextCursorId ?? null
    };
  };

  // TTL only for first page (hub focus / resume soft refresh).
  if (!isFirstPage) {
    return run();
  }

  return cachedGet(threadsCacheKey(query), run, {
    ttlMs: THREADS_TTL_MS,
    force
  });
}

export function invalidateThreadsCache(): void {
  invalidateRequestCacheMatching("threads:");
}

export type ThreadPreference = {
  otherUserId: number;
  muted: boolean;
  archived: boolean;
  leftAt: string | null;
};

/** Single-peer mute/archive/left — prefer over listThreads for Chat UI flags. */
export async function getThreadPreference(otherUserId: number): Promise<ThreadPreference> {
  const res = await api.get<{ ok: true; preference: ThreadPreference }>(
    `/messages/threads/${otherUserId}`
  );
  return (
    res.data.preference ?? {
      otherUserId,
      muted: false,
      archived: false,
      leftAt: null
    }
  );
}

export async function updateThreadPreference(
  otherUserId: number,
  patch: { muted?: boolean; archived?: boolean; left?: boolean }
): Promise<ThreadPreference> {
  const res = await api.patch<{ ok: true; preference: ThreadPreference }>(
    `/messages/threads/${otherUserId}`,
    patch
  );
  invalidateThreadsCache();
  return res.data.preference;
}

export type ConversationDeletion = {
  otherUserId: number;
  deletedMessageCount: number;
  deletedPreferenceCount: number;
  deletedAt: string;
};

/** Permanently delete this chat/conversation from the database (connections unchanged). */
export async function deleteConversation(otherUserId: number): Promise<ConversationDeletion> {
  const res = await api.delete<{ ok: true; deletion: ConversationDeletion }>(
    `/messages/threads/${otherUserId}`
  );
  invalidateThreadsCache();
  return res.data.deletion;
}

const MAX_HISTORY_LIMIT = 50;

export async function getHistory(
  otherUserId: number,
  limit = 30,
  cursorId?: number
): Promise<{ messages: MessageItem[]; nextCursorId: number | null }> {
  const safeLimit = Math.min(Math.max(1, limit), MAX_HISTORY_LIMIT);
  const params: { limit: number; cursorId?: number } = { limit: safeLimit };
  if (cursorId) params.cursorId = cursorId;
  const res = await api.get<{ ok: true; messages: MessageItem[]; nextCursorId: number | null }>(
    `/messages/with/${otherUserId}`,
    { params }
  );
  return { messages: res.data.messages ?? [], nextCursorId: res.data.nextCursorId ?? null };
}

export async function sendMessage(recipientId: number, body: string, clientId?: string) {
  const res = await api.post<{ ok: true; message: MessageItem }>("/messages", {
    recipientId,
    body,
    clientId
  });
  // Hub list uses a 45s TTL — clear so back-navigation does not show a stale lastMessage.
  invalidateThreadsCache();
  return res.data.message;
}

export type MessageDeleteScope = "everyone" | "me";

export type MessageDeletion = {
  messageId: number;
  conversationPeerId: number;
  deleteScope: MessageDeleteScope;
  deletedAt: string;
};

/** Server decides delete-for-everyone vs delete-for-me from auth + ownership. */
export async function deleteMessage(messageId: number): Promise<MessageDeletion> {
  const res = await api.delete<{ ok: true; deletion: MessageDeletion }>(`/messages/${messageId}`);
  return res.data.deletion;
}

export async function markRead(otherUserId: number) {
  const res = await api.post<{ ok: true; readAt: string }>(`/messages/with/${otherUserId}/read`);
  return res.data.readAt;
}

