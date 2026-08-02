import { api } from "../api/client";

const queue: Array<{ event_type: string; post_id?: number; meta?: Record<string, unknown> }> = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, 800);
}

async function flush(): Promise<void> {
  if (queue.length === 0) return;
  const batch = queue.splice(0, 25);
  try {
    // One auth + one insert burst instead of N round-trips.
    await api.post("/posts/events", { events: batch });
  } catch {
    // non-blocking analytics
  }
  if (queue.length > 0) scheduleFlush();
}

/** Debounced feed engagement logging. */
export function trackFeedAction(
  eventType: string,
  postId?: number,
  meta?: Record<string, unknown>
): void {
  queue.push({
    event_type: eventType,
    ...(postId != null ? { post_id: postId } : {}),
    ...(meta ? { meta } : {})
  });
  scheduleFlush();
}
