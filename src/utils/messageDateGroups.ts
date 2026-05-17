import type { MessageItem } from "../api/messages.api";

export type ChatListRow =
  | { kind: "date"; id: string; label: string }
  | { kind: "message"; id: string; message: MessageItem };

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Human-readable day label for message grouping */
export function formatMessageDayLabel(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const today = startOfDay(now);
  const day = startOfDay(date);
  const diffDays = Math.round((today - day) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return date.toLocaleDateString(undefined, { weekday: "long" });
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined
  });
}

/** Insert date separator rows between messages (chronological order). */
export function buildChatListRows(messages: MessageItem[]): ChatListRow[] {
  const rows: ChatListRow[] = [];
  let lastDay: string | null = null;

  for (const message of messages) {
    const label = formatMessageDayLabel(message.createdAt);
    if (label && label !== lastDay) {
      lastDay = label;
      rows.push({ kind: "date", id: `date-${label}-${message.id}`, label });
    }
    rows.push({
      kind: "message",
      id: message.clientId ? `c:${message.clientId}` : String(message.id),
      message
    });
  }

  return rows;
}
