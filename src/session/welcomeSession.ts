/**
 * In-memory welcome card visibility for the current login session only.
 * Resets on signIn (fresh login), not on tab navigation or session restore.
 */
let sessionEpoch = 0;
let dismissedEpoch: number | null = null;

export function beginWelcomeSession(): void {
  sessionEpoch += 1;
  dismissedEpoch = null;
}

export function clearWelcomeSession(): void {
  sessionEpoch += 1;
  dismissedEpoch = null;
}

export function isWelcomeDismissedForSession(): boolean {
  return dismissedEpoch === sessionEpoch;
}

export function markWelcomeDismissedForSession(): void {
  dismissedEpoch = sessionEpoch;
}

export function shouldShowWelcomeCard(): boolean {
  return !isWelcomeDismissedForSession();
}
