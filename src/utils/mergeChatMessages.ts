import type { MessageItem } from "../api/messages.api";

export type MergeChatOptions = {
  /** Session-local tombstones so a soft sync cannot resurrect a deleted row. */
  forgottenIds?: Iterable<number>;
  /**
   * When the server returns an empty page, drop confirmed local rows.
   * Use for recent sync / initial load so delete-for-everyone cannot stick
   * around after the last visible message is gone.
   */
  clearConfirmedIfEmpty?: boolean;
};

/**
 * Merge server history with in-memory messages (optimistic + live socket rows).
 * Prefer server rows; keep optimistic rows that have not been confirmed yet.
 *
 * When `incoming` includes confirmed messages, any local confirmed message whose
 * id falls inside that window but is missing from the server response is dropped
 * (covers delete-for-everyone / delete-for-me after reconnect).
 */
export function mergeChatMessages(
  existing: MessageItem[],
  incoming: MessageItem[],
  options?: MergeChatOptions
): MessageItem[] {
  const forgotten = new Set<number>();
  if (options?.forgottenIds) {
    for (const id of options.forgottenIds) {
      const n = Number(id);
      if (n > 0) forgotten.add(n);
    }
  }

  const byId = new Map<number, MessageItem>();
  const byClientId = new Map<string, MessageItem>();

  const upsert = (m: MessageItem) => {
    if (m.id > 0 && forgotten.has(m.id)) return;
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
  let out: MessageItem[] = [];

  for (const m of byId.values()) {
    if (m.clientId) seenClient.add(m.clientId);
    out.push(m);
  }

  for (const m of byClientId.values()) {
    if (m.id > 0) continue;
    if (m.clientId && seenClient.has(m.clientId)) continue;
    out.push(m);
  }

  const serverIds = new Set(
    incoming.filter((m) => m.id > 0 && !forgotten.has(m.id)).map((m) => m.id)
  );
  if (serverIds.size > 0) {
    let minServerId = Infinity;
    for (const id of serverIds) {
      if (id < minServerId) minServerId = id;
    }
    out = out.filter((m) => {
      if (m.id <= 0) return true;
      if (forgotten.has(m.id)) return false;
      if (m.id >= minServerId && !serverIds.has(m.id)) return false;
      return true;
    });
  } else {
    out = out.filter((m) => {
      if (m.id <= 0) return true;
      if (forgotten.has(m.id)) return false;
      if (options?.clearConfirmedIfEmpty && incoming.length === 0) return false;
      return true;
    });
  }

  out.sort((a, b) => {
    const ta = Date.parse(a.createdAt) || 0;
    const tb = Date.parse(b.createdAt) || 0;
    if (ta !== tb) return ta - tb;
    return a.id - b.id;
  });

  return out;
}
