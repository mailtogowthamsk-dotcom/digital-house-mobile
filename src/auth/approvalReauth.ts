/**
 * One-shot copy after a waiting registration session is ended (admin approved
 * or the pending JWT was revoked). Consumed on Landing.
 */

const APPROVED_MESSAGE =
  "Your account was approved. Please sign in with OTP or Google to continue.";

const GENERIC_MESSAGE = "Please sign in with OTP or Google to continue.";

let pendingMessage: string | null = null;

export function markApprovalReauthRequired(approved: boolean): void {
  pendingMessage = approved ? APPROVED_MESSAGE : GENERIC_MESSAGE;
}

export function consumeApprovalReauthMessage(): string | null {
  const message = pendingMessage;
  pendingMessage = null;
  return message;
}
