/** Guards axios 401 handler during cold-start session restore (avoids clearing a valid token mid-bootstrap). */
let allowAutoClearOn401 = false;

export function setAllowAutoClearOn401(allowed: boolean) {
  allowAutoClearOn401 = allowed;
}

export function shouldAutoClearOn401(): boolean {
  return allowAutoClearOn401;
}

export type AuthSignOut = () => Promise<void>;

let signOutHandler: AuthSignOut | null = null;

export function registerAuthSignOut(handler: AuthSignOut) {
  signOutHandler = handler;
}

export async function invokeAuthSignOut() {
  if (signOutHandler) {
    await signOutHandler();
    return;
  }
  const { clearToken } = await import("../storage/token.storage");
  const { disconnectSocket } = await import("../realtime/socket");
  disconnectSocket();
  await clearToken();
}
