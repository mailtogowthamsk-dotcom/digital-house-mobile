/**
 * Dev/staging duplicate HTTP detection (measurement only — does not cancel requests).
 *
 * Enable: EXPO_PUBLIC_DUPLICATE_REQUEST_DETECT=1 or __DEV__
 * Window: EXPO_PUBLIC_DUPLICATE_REQUEST_MS (default 750)
 */

type Seen = { at: number; count: number };

const recent = new Map<string, Seen>();

function enabled(): boolean {
  try {
    if (typeof __DEV__ !== "undefined" && __DEV__) return true;
    const v = (process.env.EXPO_PUBLIC_DUPLICATE_REQUEST_DETECT || "").trim().toLowerCase();
    return v === "1" || v === "true" || v === "yes";
  } catch {
    return false;
  }
}

function windowMs(): number {
  const n = Number(process.env.EXPO_PUBLIC_DUPLICATE_REQUEST_MS || 750);
  return Number.isFinite(n) && n > 0 ? n : 750;
}

function normalizePath(url: string): string {
  try {
    const u = url.includes("://") ? new URL(url) : new URL(url, "https://local.invalid");
    return `${u.pathname}`.replace(/\/+$/, "") || "/";
  } catch {
    return url.split("?")[0] || url;
  }
}

/** Call from axios request interceptor. Does not block or dedupe. */
export function noteOutgoingRequest(method: string, url: string): void {
  if (!enabled()) return;
  const m = (method || "get").toLowerCase();
  // Only flag GETs — POSTs often legitimately repeat
  if (m !== "get") return;
  const path = normalizePath(url);
  const key = `${m}:${path}`;
  const now = Date.now();
  const win = windowMs();
  const prev = recent.get(key);
  if (prev && now - prev.at <= win) {
    prev.count += 1;
    // eslint-disable-next-line no-console
    console.warn(
      "[DUPLICATE-REQUEST]",
      JSON.stringify({
        method: m,
        route: path,
        withinMs: now - prev.at,
        countInWindow: prev.count,
        note: "Detection only — request still sent. Trace StrictMode/focus/remount/retry."
      })
    );
  } else {
    recent.set(key, { at: now, count: 1 });
  }
  // Opportunistic prune
  if (recent.size > 80) {
    for (const [k, v] of recent) {
      if (now - v.at > win * 4) recent.delete(k);
    }
  }
}
