import { api } from "./client";

export type ChatLane = "community" | "matrimony";

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
  primaryLane?: ChatLane | null;
  chatLanes?: ChatLane[];
  code?: string;
  message?: string;
  reason?: "matrimony_match" | "connection" | "legacy_thread" | "blocked" | "no_permission";
};

export async function getMessageAccess(otherUserId: number): Promise<MessageAccess> {
  const res = await api.get<{ ok: true; access: MessageAccess }>(`/messages/access/${otherUserId}`);
  return res.data.access;
}

export async function listThreads(opts?: {
  includeArchived?: boolean;
  archivedOnly?: boolean;
}): Promise<Thread[]> {
  const res = await api.get<{ ok: true; threads: Thread[] }>("/messages/threads", {
    params: {
      ...(opts?.includeArchived ? { includeArchived: "1" } : {}),
      ...(opts?.archivedOnly ? { archivedOnly: "1" } : {})
    }
  });
  return res.data.threads ?? [];
}

export type ThreadPreference = {
  otherUserId: number;
  muted: boolean;
  archived: boolean;
  leftAt: string | null;
};

export async function updateThreadPreference(
  otherUserId: number,
  patch: { muted?: boolean; archived?: boolean; left?: boolean }
): Promise<ThreadPreference> {
  const res = await api.patch<{ ok: true; preference: ThreadPreference }>(
    `/messages/threads/${otherUserId}`,
    patch
  );
  return res.data.preference;
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

