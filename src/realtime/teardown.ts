/**
 * Breaks import cycles: socket teardown / rewire without importing chat modules.
 */

type TeardownFn = () => void;
type RewireFn = () => void;

const teardownFns: TeardownFn[] = [];
const rewireFns: RewireFn[] = [];

export function registerRealtimeTeardown(fn: TeardownFn): void {
  teardownFns.push(fn);
}

export function runRealtimeTeardowns(): void {
  for (const fn of teardownFns) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
}

/** Called after a fresh socket is ready so chat/delivery/presence can re-attach. */
export function registerRealtimeRewire(fn: RewireFn): void {
  rewireFns.push(fn);
}

export function runRealtimeRewires(): void {
  for (const fn of rewireFns) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
}
