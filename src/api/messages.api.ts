import { api } from "./client";

export type Thread = {
  otherUser: { id: number; name: string; profileImage: string | null; online: boolean };
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
  clientId: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
};

export async function listThreads(): Promise<Thread[]> {
  const res = await api.get<{ ok: true; threads: Thread[] }>("/messages/threads");
  return res.data.threads ?? [];
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

export async function markRead(otherUserId: number) {
  const res = await api.post<{ ok: true; readAt: string }>(`/messages/with/${otherUserId}/read`);
  return res.data.readAt;
}

