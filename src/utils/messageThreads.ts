import type { MessageItem, Thread } from "../api/messages.api";

type LastMessage = NonNullable<Thread["lastMessage"]>;

function toLastMessage(m: Pick<MessageItem, "id" | "senderId" | "recipientId" | "body" | "createdAt" | "deliveredAt" | "readAt">): LastMessage {
  return {
    id: m.id,
    senderId: m.senderId,
    recipientId: m.recipientId,
    body: m.body,
    createdAt: m.createdAt,
    deliveredAt: m.deliveredAt,
    readAt: m.readAt
  };
}

/** Update thread list when a message arrives over the socket (hub list). */
export function patchThreadsFromMessage(
  threads: Thread[],
  m: Pick<MessageItem, "id" | "senderId" | "recipientId" | "body" | "createdAt" | "deliveredAt" | "readAt">,
  meId: number
): { threads: Thread[]; needsFullReload: boolean } {
  const myId = Number(meId);
  const senderId = Number(m.senderId);
  const recipientId = Number(m.recipientId);
  const otherUserId = senderId === myId ? recipientId : senderId;
  const idx = threads.findIndex((t) => Number(t.otherUser.id) === otherUserId);
  if (idx < 0) {
    return { threads, needsFullReload: true };
  }

  const prev = threads[idx];
  const lastMessage = toLastMessage({ ...m, id: Number(m.id), senderId, recipientId });
  const isDuplicate = prev.lastMessage?.id === Number(m.id);
  const isIncoming = recipientId === myId && senderId !== myId;
  const unreadCount =
    isIncoming && !m.readAt && !isDuplicate ? prev.unreadCount + 1 : prev.unreadCount;

  const updated: Thread = { ...prev, lastMessage, unreadCount };
  const rest = threads.filter((_, i) => i !== idx);
  return { threads: [updated, ...rest], needsFullReload: false };
}

/** Clear unread for a thread after opening / marking read. */
export function clearThreadUnread(threads: Thread[], otherUserId: number): Thread[] {
  return threads.map((t) =>
    t.otherUser.id === otherUserId ? { ...t, unreadCount: 0 } : t
  );
}
