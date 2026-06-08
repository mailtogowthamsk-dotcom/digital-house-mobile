/** Breaks import cycles: socket teardown without importing chat/notification modules. */

type TeardownFn = () => void;

const fns: TeardownFn[] = [];

export function registerRealtimeTeardown(fn: TeardownFn): void {
  fns.push(fn);
}

export function runRealtimeTeardowns(): void {
  for (const fn of fns) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
}
