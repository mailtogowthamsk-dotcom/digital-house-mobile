/**
 * P4B — bounded HTTP concurrency with priority lanes (P0 > P1 > P2).
 * FIFO within a priority. P2 is not starved forever (drains when higher empty).
 */

export type RequestPriority = "P0" | "P1" | "P2";

export type HttpSchedulerSnapshot = {
  maxConcurrent: number;
  active: number;
  queuedP0: number;
  queuedP1: number;
  queuedP2: number;
};

type QueuedTask = {
  id: number;
  priority: RequestPriority;
  enqueuedAt: number;
  run: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  cancelled: boolean;
};

const PRIORITY_ORDER: RequestPriority[] = ["P0", "P1", "P2"];

/** Conservative default — matches local DB pool max of 3. */
export const DEFAULT_HTTP_MAX_CONCURRENT = 3;

let maxConcurrent = DEFAULT_HTTP_MAX_CONCURRENT;
let active = 0;
let nextId = 1;
const queues: Record<RequestPriority, QueuedTask[]> = {
  P0: [],
  P1: [],
  P2: []
};

export function configureHttpScheduler(opts: { maxConcurrent?: number }): void {
  if (opts.maxConcurrent != null && opts.maxConcurrent >= 1) {
    maxConcurrent = Math.min(8, Math.floor(opts.maxConcurrent));
  }
  pump();
}

export function getHttpSchedulerSnapshot(): HttpSchedulerSnapshot {
  return {
    maxConcurrent,
    active,
    queuedP0: queues.P0.length,
    queuedP1: queues.P1.length,
    queuedP2: queues.P2.length
  };
}

/** Test helper — drain all waiting work and reset counters. */
export function resetHttpSchedulerForTests(): void {
  for (const p of PRIORITY_ORDER) {
    for (const t of queues[p]) {
      t.cancelled = true;
      t.reject(new Error("http-scheduler reset"));
    }
    queues[p].length = 0;
  }
  active = 0;
  maxConcurrent = DEFAULT_HTTP_MAX_CONCURRENT;
}

function logQueue(event: string, extra?: Record<string, unknown>): void {
  if (typeof __DEV__ === "undefined" || !__DEV__) return;
  // eslint-disable-next-line no-console
  console.log(
    "[http-queue]",
    JSON.stringify({
      event,
      active,
      max: maxConcurrent,
      q0: queues.P0.length,
      q1: queues.P1.length,
      q2: queues.P2.length,
      ...extra
    })
  );
}

/**
 * Note: priority applies to the queue only — already-running P2 cannot be preempted.
 * P4E therefore delays enqueue of /advertisements/feed until Home is interactive
 * (see PaidFeedAd + onHomeInteractive), so ads do not grab a slot during cold-start P0.
 */

function dequeueNext(): QueuedTask | undefined {
  for (const p of PRIORITY_ORDER) {
    while (queues[p].length > 0) {
      const task = queues[p].shift()!;
      if (!task.cancelled) return task;
    }
  }
  return undefined;
}

function pump(): void {
  while (active < maxConcurrent) {
    const task = dequeueNext();
    if (!task) return;
    active += 1;
    const waitMs = Date.now() - task.enqueuedAt;
    logQueue("start", { priority: task.priority, id: task.id, waitMs });
    void Promise.resolve()
      .then(() => task.run())
      .then(
        (value) => {
          active -= 1;
          logQueue("done", { priority: task.priority, id: task.id });
          task.resolve(value);
          pump();
        },
        (err) => {
          active -= 1;
          logQueue("error", { priority: task.priority, id: task.id });
          task.reject(err);
          pump();
        }
      );
  }
}

/**
 * Schedule work behind the concurrency limiter.
 * Returns a cancel function for queued (not yet started) tasks.
 */
export function scheduleHttpRequest<T>(
  priority: RequestPriority,
  run: () => Promise<T>
): { promise: Promise<T>; cancel: () => void } {
  let task: QueuedTask | undefined;
  const promise = new Promise<T>((resolve, reject) => {
    task = {
      id: nextId++,
      priority,
      enqueuedAt: Date.now(),
      run: () => run() as Promise<unknown>,
      resolve: (v) => resolve(v as T),
      reject,
      cancelled: false
    };
    queues[priority].push(task);
    logQueue("enqueue", { priority, id: task.id });
    pump();
  });

  const cancel = () => {
    if (!task || task.cancelled) return;
    task.cancelled = true;
    // If still queued, remove and reject.
    const q = queues[task.priority];
    const idx = q.indexOf(task);
    if (idx >= 0) {
      q.splice(idx, 1);
      task.reject(Object.assign(new Error("Request cancelled"), { code: "ERR_CANCELED" }));
      logQueue("cancel", { priority: task.priority, id: task.id });
    }
  };

  return { promise, cancel };
}

export function scheduleHttpRequestPromise<T>(
  priority: RequestPriority,
  run: () => Promise<T>
): Promise<T> {
  return scheduleHttpRequest(priority, run).promise;
}

type PriorityConfig = {
  method?: string;
  url?: string;
  baseURL?: string;
  headers?: Record<string, unknown>;
  __httpPriority?: RequestPriority;
};

/**
 * Classify Axios-like configs into priority lanes.
 * Explicit `__httpPriority` always wins.
 */
export function classifyRequestPriority(config: PriorityConfig): RequestPriority {
  if (config.__httpPriority) return config.__httpPriority;

  const method = String(config.method ?? "get").toLowerCase();
  const path = `${config.url ?? ""}`.toLowerCase();

  // Background / deferred
  if (
    path.includes("advertisement") ||
    path.includes("/ads") ||
    path.includes("impression") ||
    path.includes("last-seen") ||
    path.includes("last_seen") ||
    path.includes("presence") ||
    path.includes("analytics") ||
    path.includes("telemetry")
  ) {
    return "P2";
  }

  // Mutations and auth are interactive
  if (method !== "get" && method !== "head" && method !== "options") {
    return "P0";
  }

  // Soft home summary refresh
  if (path.includes("/home/summary")) return "P1";

  // Everything else interactive (feed, bootstrap, chat, stories tray, profile, …)
  return "P0";
}

/** Multipart / media uploads must not fill the API slot budget. */
export function shouldBypassHttpScheduler(config: {
  url?: string;
  headers?: Record<string, unknown>;
  __bypassHttpScheduler?: boolean;
  __authRetry?: boolean;
}): boolean {
  if (config.__bypassHttpScheduler) return true;
  if (config.__authRetry) return true;
  const path = String(config.url ?? "").toLowerCase();
  if (path.includes("/media/") || path.includes("upload") || path.includes("/files/")) {
    return true;
  }
  const ct = String(
    (config.headers?.["Content-Type"] ?? config.headers?.["content-type"] ?? "") as string
  ).toLowerCase();
  if (ct.includes("multipart/form-data")) return true;
  return false;
}
