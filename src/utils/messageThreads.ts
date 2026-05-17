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
  const otherUserId = m.senderId === meId ? m.recipientId : m.senderId;
  const idx = threads.findIndex((t) => t.otherUser.id === otherUserId);
  if (idx < 0) {
    return { threads, needsFullReload: true };
  }

  const prev = threads[idx];
  const lastMessage = toLastMessage(m);
  const isDuplicate = prev.lastMessage?.id === m.id;
  const isIncoming = m.recipientId === meId && m.senderId !== meId;
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
