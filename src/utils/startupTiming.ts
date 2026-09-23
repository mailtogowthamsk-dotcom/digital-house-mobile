/**
 * Mobile startup / Home interactivity timing (measurement only).
 *
 * Enable:
 *   EXPO_PUBLIC_STARTUP_METRICS=1
 * or automatically in __DEV__.
 *
 * Definitions:
 *   TIME_TO_FIRST_HOME_RENDER — first Home content paint (summary or feed cards visible),
 *     not AuthSplash / blank loading shell.
 *   TIME_TO_INTERACTIVE_HOME — Home usable: bootstrap settled (loading flags false) with
 *     summary and/or feed available (errors still count as "settled").
 *
 * P4E: `onHomeInteractive` lets non-critical UI (PaidFeedAd) wait for Home without setTimeout.
 */

type MarkName =
  | "origin"
  | "app_mount"
  | "auth_restore_start"
  | "auth_restore_end"
  | "auth_me_done"
  | "platform_bootstrap_start"
  | "platform_bootstrap_end"
  | "home_bootstrap_start"
  | "home_bootstrap_end"
  | "home_first_render"
  | "home_interactive"
  | "stories_seeded"
  | "unread_seeded"
  | "ads_deferred_start"
  | "ads_deferred_ready";

const marks = new Map<MarkName, number>();
const origin = Date.now();
marks.set("origin", origin);

type HomeInteractiveListener = () => void;
const homeInteractiveListeners = new Set<HomeInteractiveListener>();
let homeInteractiveReached = false;

function enabled(): boolean {
  try {
    if (typeof __DEV__ !== "undefined" && __DEV__) return true;
    const v = (process.env.EXPO_PUBLIC_STARTUP_METRICS || "").trim().toLowerCase();
    return v === "1" || v === "true" || v === "yes";
  } catch {
    return false;
  }
}

/** True once Home bootstrap/feed first settle (including error settle). */
export function isHomeInteractive(): boolean {
  return homeInteractiveReached;
}

/**
 * Subscribe to first Home-interactive signal.
 * If already interactive, invokes `cb` on next microtask.
 * Returns unsubscribe.
 */
export function onHomeInteractive(cb: HomeInteractiveListener): () => void {
  if (homeInteractiveReached) {
    Promise.resolve()
      .then(() => {
        try {
          cb();
        } catch {
          /* ignore */
        }
      })
      .catch(() => undefined);
    return () => undefined;
  }
  homeInteractiveListeners.add(cb);
  return () => {
    homeInteractiveListeners.delete(cb);
  };
}

function notifyHomeInteractive(): void {
  if (homeInteractiveReached) return;
  homeInteractiveReached = true;
  const listeners = [...homeInteractiveListeners];
  homeInteractiveListeners.clear();
  for (const cb of listeners) {
    try {
      cb();
    } catch {
      /* ignore */
    }
  }
}

/** Test helper — reset interactive gate between unit tests. */
export function resetHomeInteractiveForTests(): void {
  homeInteractiveReached = false;
  homeInteractiveListeners.clear();
  marks.delete("home_interactive");
}

export function startupMark(name: MarkName, detail?: Record<string, unknown>): void {
  // Gate must fire even when metrics logging is disabled (P4E ads dependency).
  if (name === "home_interactive") {
    notifyHomeInteractive();
  }

  if (!enabled()) return;

  if (marks.has(name) && name !== "origin") {
    // Keep first occurrence for primary milestones; allow re-log of detail only.
    if (
      name === "home_first_render" ||
      name === "home_interactive" ||
      name === "auth_me_done" ||
      name === "home_bootstrap_end"
    ) {
      return;
    }
  }
  const at = Date.now();
  if (!marks.has(name)) marks.set(name, at);
  const sinceOrigin = at - origin;
  // eslint-disable-next-line no-console
  console.log(
    "[startup-metrics]",
    JSON.stringify({
      mark: name,
      sinceOriginMs: sinceOrigin,
      ...(detail ?? {})
    })
  );
  if (name === "home_interactive" || name === "home_first_render") {
    emitSummary();
  }
}

function emitSummary(): void {
  if (!enabled()) return;
  const o = marks.get("origin") ?? origin;
  const get = (n: MarkName) => {
    const t = marks.get(n);
    return t != null ? t - o : null;
  };
  // eslint-disable-next-line no-console
  console.log(
    "[startup-metrics]",
    JSON.stringify({
      summary: true,
      TIME_TO_FIRST_HOME_RENDER: get("home_first_render"),
      TIME_TO_INTERACTIVE_HOME: get("home_interactive"),
      authRestoreMs: get("auth_restore_end"),
      authMeMs: get("auth_me_done"),
      platformBootstrapMs: get("platform_bootstrap_end"),
      homeBootstrapMs: get("home_bootstrap_end"),
      notes:
        "Component durations are since origin unless nested; parallel work is not summed."
    })
  );
}

export function getStartupMarks(): Record<string, number> {
  const o = marks.get("origin") ?? origin;
  const out: Record<string, number> = {};
  for (const [k, v] of marks) out[k] = v - o;
  return out;
}
