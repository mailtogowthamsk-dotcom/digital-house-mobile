/**
 * Lightweight GET coalescing + optional TTL cache.
 * User-scoped — clear on logout / identity change.
 */

type CacheEntry = {
  value: unknown;
  expiresAt: number;
};

const inflight = new Map<string, Promise<unknown>>();
const ttlCache = new Map<string, CacheEntry>();

let cacheUserKey = "anon";

function scoped(key: string): string {
  return `${cacheUserKey}::${key}`;
}

export function setRequestCacheUserId(userId: number | null | undefined): void {
  const next = userId != null && Number.isFinite(userId) ? String(userId) : "anon";
  if (next !== cacheUserKey) {
    clearAllRequestCaches();
    cacheUserKey = next;
  }
}

export function clearAllRequestCaches(): void {
  inflight.clear();
  ttlCache.clear();
}

export function invalidateRequestCache(keyOrPrefix: string): void {
  const full = scoped(keyOrPrefix);
  ttlCache.delete(full);
  // Also match prefix (e.g. "threads:" clears all folders)
  for (const k of [...ttlCache.keys()]) {
    if (k === full || k.startsWith(`${full}`) || k.includes(`::${keyOrPrefix}`)) {
      ttlCache.delete(k);
    }
  }
}

/** Invalidate every TTL entry whose logical key contains `needle`. */
export function invalidateRequestCacheMatching(needle: string): void {
  for (const k of [...ttlCache.keys()]) {
    if (k.includes(needle)) ttlCache.delete(k);
  }
}

export const CacheKeys = {
  storiesTray: "stories:tray",
  threadsInbox: "threads:inbox",
  threadsArchived: "threads:archived",
  threadsIncludeArchived: "threads:includeArchived",
  matrimonyHub: "matrimony:hub",
  legalStatus: "legal:status",
  notificationCounts: "notifications:counts",
  homeSummary: "home:summary",
  homeBootstrap: "home:bootstrap",
  jobsFeed: "jobs:feed",
  helpingHandsFeed: "helpingHands:feed",
  authMe: "auth:me"
} as const;

function logDev(
  kind: "NEW" | "REUSE" | "CACHE_HIT" | "COMPLETE" | "CACHE_MISS",
  key: string,
  extra?: string
) {
  if (!__DEV__) return;
  const suffix = extra ? ` ${extra}` : "";
  // eslint-disable-next-line no-console
  console.log(`[API DEDUPE] ${kind} ${key}${suffix}`);
  if (kind === "CACHE_HIT" || kind === "CACHE_MISS" || kind === "REUSE" || kind === "NEW") {
    // eslint-disable-next-line no-console
    console.log(
      "[cache-metrics]",
      JSON.stringify({ event: kind, key, ...(extra ? { extra } : {}) })
    );
  }
}


/**
 * Shared loader: fresh TTL → return; else coalesce in-flight; else fetch + store.
 */
export async function cachedGet<T>(
  logicalKey: string,
  fetcher: () => Promise<T>,
  opts?: { ttlMs?: number; force?: boolean }
): Promise<T> {
  const key = scoped(logicalKey);
  const ttlMs = opts?.ttlMs ?? 0;
  const force = opts?.force === true;

  if (!force && ttlMs > 0) {
    const hit = ttlCache.get(key);
    if (hit && hit.expiresAt > Date.now()) {
      logDev("CACHE_HIT", logicalKey);
      return hit.value as T;
    }
    if (ttlMs > 0) logDev("CACHE_MISS", logicalKey);
  }

  const existing = inflight.get(key);
  if (existing) {
    logDev("REUSE", logicalKey);
    return existing as Promise<T>;
  }

  logDev("NEW", logicalKey);
  const promise = (async () => {
    try {
      const value = await fetcher();
      if (ttlMs > 0) {
        ttlCache.set(key, { value, expiresAt: Date.now() + ttlMs });
      }
      return value;
    } finally {
      inflight.delete(key);
      logDev("COMPLETE", logicalKey);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

/** Stable query-string for axios params objects. */
export function normalizeParams(params: unknown): string {
  if (params == null) return "";
  if (typeof params !== "object") return String(params);
  const entries = Object.entries(params as Record<string, unknown>)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => [k, Array.isArray(v) ? v.map(String).sort().join(",") : String(v)] as const)
    .sort(([a], [b]) => a.localeCompare(b));
  return entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
}

export function buildGetRequestKey(
  method: string,
  baseURL: string | undefined,
  url: string | undefined,
  params: unknown
): string {
  const m = (method || "get").toLowerCase();
  const base = (baseURL || "").replace(/\/+$/, "");
  const path = url || "";
  const q = normalizeParams(params);
  return scoped(`${m}|${base}|${path}|${q}`);
}

/**
 * Install axios-level GET in-flight coalescing on an instance.
 * Retries (__retryCount / __authRetry) bypass reuse of a settled failure by using a distinct key suffix.
 *
 * Optional `wrapNew` runs only for newly started GETs (not REUSE) — used by the HTTP scheduler
 * so duplicate callers share one queue slot via the shared promise.
 */
export function installAxiosGetDedupe(
  axiosInstance: {
    request: (config: any) => Promise<any>;
  },
  opts?: {
    wrapNew?: (run: () => Promise<any>, config: any) => Promise<any>;
  }
): void {
  const original = axiosInstance.request.bind(axiosInstance);
  axiosInstance.request = function dedupedRequest(config: any) {
    const method = String(config?.method || "get").toLowerCase();
    if (method !== "get") {
      return original(config);
    }

    // Force unique key for interceptor-driven retries so we don't reuse a rejected promise.
    const retrySuffix =
      config?.__authRetry || config?.__retryCount
        ? `|r${config.__authRetry ? "a" : ""}${config.__retryCount ?? 0}`
        : "";

    const key =
      buildGetRequestKey(method, config.baseURL, config.url, config.params) + retrySuffix;

    const existing = inflight.get(key);
    if (existing) {
      logDev("REUSE", config.url || key);
      return existing;
    }

    logDev("NEW", config.url || key);
    const run = () => original(config);
    const started = opts?.wrapNew ? opts.wrapNew(run, config) : run();
    const promise = started.finally(() => {
      inflight.delete(key);
      logDev("COMPLETE", config.url || key);
    });
    inflight.set(key, promise);
    return promise;
  };
}
