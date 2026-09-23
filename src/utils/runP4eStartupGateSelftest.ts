/**
 * P4E contract: Home-interactive gate for deferred ads (no setTimeout).
 */
import {
  isHomeInteractive,
  onHomeInteractive,
  resetHomeInteractiveForTests,
  startupMark
} from "../utils/startupTiming";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

export async function runP4eStartupGateContractTests(): Promise<void> {
  resetHomeInteractiveForTests();
  assert(isHomeInteractive() === false, "starts non-interactive");

  const seen: string[] = [];
  const unsub = onHomeInteractive(() => {
    seen.push("ads");
  });
  startupMark("home_interactive");
  assert(isHomeInteractive() === true, "interactive after mark");
  assert(seen.join(",") === "ads", "listener fired");
  unsub();

  resetHomeInteractiveForTests();
  const blocked: string[] = [];
  const unsub2 = onHomeInteractive(() => {
    blocked.push("x");
  });
  unsub2();
  startupMark("home_interactive");
  assert(blocked.length === 0, "unsubscribed listener silent");
  assert(isHomeInteractive() === true, "still interactive");

  resetHomeInteractiveForTests();
  startupMark("home_interactive");
  const late: string[] = [];
  onHomeInteractive(() => {
    late.push("late");
  });
  await Promise.resolve();
  assert(late.join(",") === "late", "late subscriber after interactive");

  // eslint-disable-next-line no-console
  console.log("p4e-startup-gate: OK");
}
