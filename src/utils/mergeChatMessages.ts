import type { MessageItem } from "../api/messages.api";

/**
 * Merge server history with in-memory messages (optimistic + live socket rows).
 * Prefer server rows; keep optimistic rows that have not been confirmed yet.
 */
export function mergeChatMessages(
  existing: MessageItem[],
  incoming: MessageItem[]
): MessageItem[] {
  const byId = new Map<number, MessageItem>();
  const byClientId = new Map<string, MessageItem>();

  const upsert = (m: MessageItem) => {
    const clientId = typeof m.clientId === "string" && m.clientId ? m.clientId : null;
    if (clientId) {
      const prev = byClientId.get(clientId);
      if (prev && prev.id > 0 && m.id < 0) {
        // Keep confirmed server message over optimistic duplicate
        return;
      }
      byClientId.set(clientId, m);
    }
    if (m.id > 0) {
      byId.set(m.id, m);
    }
  };

  for (const m of existing) upsert(m);
  for (const m of incoming) upsert(m);

  const seenClient = new Set<string>();
  const out: MessageItem[] = [];

  for (const m of byId.values()) {
    if (m.clientId) seenClient.add(m.clientId);
    out.push(m);
  }

  for (const m of byClientId.values()) {
    if (m.id > 0) continue;
    if (m.clientId && seenClient.has(m.clientId)) continue;
    out.push(m);
  }

  out.sort((a, b) => {
    const ta = Date.parse(a.createdAt) || 0;
    const tb = Date.parse(b.createdAt) || 0;
    if (ta !== tb) return ta - tb;
    return a.id - b.id;
  });

  return out;
}
