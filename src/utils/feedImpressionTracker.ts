/**
 * Viewport impressions for Home Feed ranking.
 * API-returned posts are NOT impressions. Count only after viewability + dwell.
 * Failure is ignored — never blocks rendering.
 */
import { trackFeedAction } from "./feedAnalytics";

const DWELL_MS = 700;
const seenThisSession = new Set<string>();
const pending = new Map<string, ReturnType<typeof setTimeout>>();

export function resetFeedImpressionSession(): void {
  seenThisSession.clear();
  for (const timer of pending.values()) clearTimeout(timer);
  pending.clear();
}

export function syncFeedImpressions(viewableIds: string[]): void {
  const visible = new Set(viewableIds.filter(Boolean));
  for (const [id, timer] of pending) {
    if (!visible.has(id)) {
      clearTimeout(timer);
      pending.delete(id);
    }
  }
  for (const id of visible) {
    if (seenThisSession.has(id) || pending.has(id)) continue;
    const postId = Number(id);
    if (!Number.isInteger(postId) || postId <= 0) continue;
    pending.set(
      id,
      setTimeout(() => {
        pending.delete(id);
        if (seenThisSession.has(id)) return;
        seenThisSession.add(id);
        trackFeedAction("post_impression", postId, { dwellMs: DWELL_MS, pct: 40 });
      }, DWELL_MS)
    );
  }
}
