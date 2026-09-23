/**
 * Pure P4B scheduler contract tests (included in tsc; no test runner required).
 * Executed via: npx ts-node --transpile-only scripts/p4b-selftest.ts
 * or by importing `runHttpSchedulerContractTests()` from the selftest script.
 */
import {
  classifyRequestPriority,
  configureHttpScheduler,
  getHttpSchedulerSnapshot,
  resetHttpSchedulerForTests,
  scheduleHttpRequest,
  scheduleHttpRequestPromise,
  shouldBypassHttpScheduler
} from "./httpScheduler";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function runHttpSchedulerContractTests(): Promise<void> {
  resetHttpSchedulerForTests();
  configureHttpScheduler({ maxConcurrent: 2 });

  assert(classifyRequestPriority({ method: "get", url: "/home/bootstrap" }) === "P0", "bootstrap P0");
  assert(classifyRequestPriority({ method: "get", url: "/home/feed" }) === "P0", "feed P0");
  assert(classifyRequestPriority({ method: "get", url: "/home/summary" }) === "P1", "summary P1");
  assert(
    classifyRequestPriority({ method: "get", url: "/advertisements/feed" }) === "P2",
    "ads P2"
  );
  assert(classifyRequestPriority({ method: "post", url: "/messages" }) === "P0", "post P0");
  assert(
    classifyRequestPriority({ method: "get", url: "/x", __httpPriority: "P2" }) === "P2",
    "explicit priority"
  );

  assert(shouldBypassHttpScheduler({ __authRetry: true }) === true, "auth bypass");
  assert(shouldBypassHttpScheduler({ url: "/media/upload" }) === true, "upload bypass");
  assert(
    shouldBypassHttpScheduler({ headers: { "Content-Type": "multipart/form-data" } }) === true,
    "multipart bypass"
  );
  assert(shouldBypassHttpScheduler({ url: "/home/bootstrap" }) === false, "bootstrap no bypass");

  let running = 0;
  let peak = 0;
  await Promise.all(
    Array.from({ length: 6 }, (_, i) =>
      scheduleHttpRequestPromise("P0", async () => {
        running += 1;
        peak = Math.max(peak, running);
        await sleep(25);
        running -= 1;
        return i;
      })
    )
  );
  assert(peak <= 2, `peak ${peak} > 2`);

  resetHttpSchedulerForTests();
  configureHttpScheduler({ maxConcurrent: 1 });
  const order: string[] = [];
  let release!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  const hold = scheduleHttpRequestPromise("P0", async () => {
    order.push("hold");
    await gate;
  });
  await sleep(5);
  const lateP2 = scheduleHttpRequestPromise("P2", async () => {
    order.push("P2");
  });
  const lateP0 = scheduleHttpRequestPromise("P0", async () => {
    order.push("P0");
  });
  release();
  await Promise.all([hold, lateP2, lateP0]);
  assert(order.join(",") === "hold,P0,P2", `priority order ${order.join(",")}`);

  resetHttpSchedulerForTests();
  configureHttpScheduler({ maxConcurrent: 1 });
  const fifo: number[] = [];
  let release2!: () => void;
  const gate2 = new Promise<void>((r) => {
    release2 = r;
  });
  const hold2 = scheduleHttpRequestPromise("P0", () => gate2.then(() => undefined));
  await sleep(5);
  const a = scheduleHttpRequestPromise("P1", async () => {
    fifo.push(1);
  });
  const b = scheduleHttpRequestPromise("P1", async () => {
    fifo.push(2);
  });
  release2();
  await Promise.all([hold2, a, b]);
  assert(fifo.join(",") === "1,2", `fifo ${fifo.join(",")}`);

  resetHttpSchedulerForTests();
  configureHttpScheduler({ maxConcurrent: 1 });
  let release3!: () => void;
  const gate3 = new Promise<void>((r) => {
    release3 = r;
  });
  const hold3 = scheduleHttpRequestPromise("P0", () => gate3.then(() => undefined));
  await sleep(5);
  let ran = false;
  const { promise: cancelledPromise, cancel } = scheduleHttpRequest("P2", async () => {
    ran = true;
  });
  cancel();
  release3();
  await hold3;
  let cancelled = false;
  try {
    await cancelledPromise;
  } catch {
    cancelled = true;
  }
  assert(cancelled, "cancelled promise should reject");
  assert(!ran, "cancelled task must not run");

  resetHttpSchedulerForTests();
  configureHttpScheduler({ maxConcurrent: 1 });
  const seen: string[] = [];
  await scheduleHttpRequestPromise("P0", async () => {
    seen.push("P0");
  });
  await scheduleHttpRequestPromise("P2", async () => {
    seen.push("P2");
  });
  assert(seen.join(",") === "P0,P2", "P2 eventually runs");

  const snap = getHttpSchedulerSnapshot();
  assert(snap.active === 0, "active drained");
  assert(snap.queuedP0 + snap.queuedP1 + snap.queuedP2 === 0, "queues drained");
}
