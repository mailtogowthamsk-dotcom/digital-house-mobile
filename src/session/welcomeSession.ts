/**
 * In-memory welcome card visibility for the current login session only.
 * Resets on signIn (fresh login), not on tab navigation or session restore.
 */
let sessionEpoch = 0;
let dismissedEpoch: number | null = null;

type WelcomeListener = () => void;
const listeners = new Set<WelcomeListener>();

function notifyWelcomeListeners(): void {
  listeners.forEach((fn) => fn());
}

export function subscribeWelcomeSession(listener: WelcomeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function beginWelcomeSession(): void {
  sessionEpoch += 1;
  dismissedEpoch = null;
  notifyWelcomeListeners();
}

export function clearWelcomeSession(): void {
  sessionEpoch += 1;
  dismissedEpoch = null;
  notifyWelcomeListeners();
}

export function isWelcomeDismissedForSession(): boolean {
  return dismissedEpoch === sessionEpoch;
}

export function markWelcomeDismissedForSession(): void {
  if (dismissedEpoch === sessionEpoch) return;
  dismissedEpoch = sessionEpoch;
  notifyWelcomeListeners();
}

export function shouldShowWelcomeCard(): boolean {
  return !isWelcomeDismissedForSession();
}
