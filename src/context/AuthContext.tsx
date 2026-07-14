import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { AppState, type AppStateStatus } from "react-native";
import { getMe, type MeUser } from "../api/auth.api";
import { getErrorStatus } from "../api/client";
import {
  registerAuthSignOut,
  setAllowAutoClearOn401,
  invokeAuthSignOut
} from "../auth/authSession";
import { getTokenReliable, setToken, clearToken } from "../storage/token.storage";
import { setUserSnapshot, getUserSnapshot, clearUserSnapshot } from "../storage/user.storage";
import { disconnectSocket, getSocket } from "../realtime/socket";
import { startDeliveryRealtime, stopDeliveryRealtime } from "../realtime/deliveryRealtime";
import { ensurePresenceRealtime } from "../realtime/presenceRealtime";
import { beginWelcomeSession, clearWelcomeSession } from "../session/welcomeSession";

export type AuthStatus = "loading" | "signedOut" | "home" | "pending" | "rejected";

export type RootAuthRoute =
  | "Landing"
  | "Home"
  | "PendingApproval"
  | "Rejected"
  | "GoogleCompleteProfile"
  | "SetUsername";

type AuthContextValue = {
  status: AuthStatus;
  user: MeUser | null;
  isRestoring: boolean;
  signIn: (accessToken: string, user: MeUser) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  initialRoute: RootAuthRoute;
  /**
   * Bumps whenever the auth gate flips (signed-out ↔ signed-in) or the post-login
   * destination changes. AppNavigation remounts NavigationContainer on this key.
   */
  sessionEpoch: number;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeAuthUser(user: MeUser): MeUser {
  return {
    ...user,
    createdAt: user.createdAt ?? new Date().toISOString(),
    profileComplete: user.profileComplete !== false,
    needsUsernameSetup:
      user.needsUsernameSetup ?? (user.status === "APPROVED" && !user.username)
  };
}

export function routeForUser(user: MeUser | null, signedOut: boolean): RootAuthRoute {
  if (signedOut || !user) return "Landing";
  if (user.profileComplete === false) return "GoogleCompleteProfile";
  if (user.status === "APPROVED" && user.needsUsernameSetup) return "SetUsername";
  if (user.status === "APPROVED") return "Home";
  if (user.status === "PENDING") return "PendingApproval";
  if (user.status === "REJECTED") return "Rejected";
  return "Landing";
}

function statusForUser(user: MeUser | null, signedOut: boolean): AuthStatus {
  if (signedOut || !user) return "signedOut";
  if (user.profileComplete === false) return "pending";
  if (user.status === "APPROVED") return "home";
  if (user.status === "PENDING") return "pending";
  if (user.status === "REJECTED") return "rejected";
  return "signedOut";
}

function isSignedInStatus(status: AuthStatus): boolean {
  return status === "home" || status === "pending" || status === "rejected";
}

async function prewarmRealtime(userId: number) {
  try {
    await getSocket();
    startDeliveryRealtime(userId);
    ensurePresenceRealtime();
  } catch {
    // offline or unsigned — ignore
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<MeUser | null>(null);
  const [sessionEpoch, setSessionEpoch] = useState(0);
  const bootstrapDone = useRef(false);
  const restoringRef = useRef(false);
  /** Blocks restore/401 sign-out while OTP/Google sign-in is committing. */
  const signInLockRef = useRef(false);
  const statusRef = useRef<AuthStatus>("loading");
  const userRef = useRef<MeUser | null>(null);
  userRef.current = user;
  statusRef.current = status;

  const applySession = useCallback((nextUser: MeUser | null, signedOut: boolean) => {
    const normalized = nextUser ? normalizeAuthUser(nextUser) : null;
    const nextStatus = statusForUser(normalized, signedOut);
    setUser(normalized);
    setStatus(nextStatus);
    statusRef.current = nextStatus;
    userRef.current = normalized;
    if (!signedOut && normalized?.status === "APPROVED" && normalized.id) {
      void prewarmRealtime(normalized.id);
    } else {
      stopDeliveryRealtime();
    }
  }, []);

  const bumpSessionEpoch = useCallback(() => {
    setSessionEpoch((n) => n + 1);
  }, []);

  const restoreSession = useCallback(async () => {
    if (signInLockRef.current) return;
    if (restoringRef.current) return;
    restoringRef.current = true;
    setAllowAutoClearOn401(false);

    try {
      const token = await getTokenReliable();
      if (!token) {
        const snapshot = await getUserSnapshot();
        if (snapshot) {
          applySession(snapshot, false);
          return;
        }
        applySession(null, true);
        return;
      }

      let me: MeUser;
      try {
        me = await getMe();
      } catch (firstErr) {
        if (getErrorStatus(firstErr) === 401) {
          await new Promise((r) => setTimeout(r, 350));
          me = await getMe();
        } else {
          throw firstErr;
        }
      }
      await setUserSnapshot(me);
      applySession(me, false);
    } catch (err) {
      if (signInLockRef.current) return;
      const httpStatus = getErrorStatus(err);
      if (httpStatus === 401) {
        const msg =
          err && typeof err === "object" && "response" in err
            ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? "")
            : "";
        if (msg === "Unauthorized") {
          const snapshot = await getUserSnapshot();
          const token = await getTokenReliable();
          if (token && snapshot) {
            applySession(snapshot, false);
            return;
          }
        }
        // Never wipe a session that was just established in-memory by signIn.
        if (isSignedInStatus(statusRef.current) && userRef.current) {
          applySession(userRef.current, false);
          return;
        }
        disconnectSocket();
        await clearToken();
        await clearUserSnapshot();
        applySession(null, true);
      } else if (httpStatus === 403) {
        const snapshot = await getUserSnapshot();
        if (snapshot) {
          applySession(snapshot, false);
        } else if (userRef.current) {
          applySession(userRef.current, false);
        } else {
          disconnectSocket();
          await clearToken();
          applySession(null, true);
        }
      } else {
        const snapshot = await getUserSnapshot();
        const token = await getTokenReliable();
        if (token && snapshot) {
          applySession(snapshot, false);
        } else if (token && userRef.current) {
          applySession(userRef.current, false);
        } else if (snapshot) {
          applySession(snapshot, false);
        } else {
          applySession(null, true);
        }
      }
    } finally {
      setAllowAutoClearOn401(true);
      restoringRef.current = false;
      bootstrapDone.current = true;
    }
  }, [applySession]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    registerAuthSignOut(async () => {
      if (signInLockRef.current) return;
      disconnectSocket();
      await clearToken();
      await clearUserSnapshot();
      clearWelcomeSession();
      applySession(null, true);
      bumpSessionEpoch();
    });
    return () => {
      registerAuthSignOut(async () => {
        await clearToken();
        await clearUserSnapshot();
      });
    };
  }, [applySession, bumpSessionEpoch]);

  useEffect(() => {
    let resumeTimer: ReturnType<typeof setTimeout> | null = null;
    const onAppState = (next: AppStateStatus) => {
      if (next === "active" && bootstrapDone.current && status === "home") {
        // Reconnect presence / delivery sockets promptly after background.
        const uid = userRef.current?.id;
        if (uid && userRef.current?.status === "APPROVED") {
          void prewarmRealtime(uid);
        }
        if (resumeTimer) clearTimeout(resumeTimer);
        resumeTimer = setTimeout(() => {
          if (!signInLockRef.current) {
            restoreSession().catch(() => {});
          }
        }, 400);
      }
    };
    const sub = AppState.addEventListener("change", onAppState);
    return () => {
      if (resumeTimer) clearTimeout(resumeTimer);
      sub.remove();
    };
  }, [restoreSession, status]);

  /**
   * Persist token + user and flip auth status so AppNavigation remounts into the
   * authenticated tree. Soft /me refresh must not use restoreSession (that can
   * race and leave UI on OtpVerify while storage already has a valid session).
   */
  const signIn = useCallback(
    async (accessToken: string, userFromApi: MeUser) => {
      signInLockRef.current = true;
      setAllowAutoClearOn401(false);
      try {
        const normalized = normalizeAuthUser(userFromApi);
        if (!normalized.status) {
          throw new Error("Login succeeded but user status is missing. Please try again.");
        }

        beginWelcomeSession();
        await setToken(accessToken);
        await setUserSnapshot(normalized);
        applySession(normalized, false);
        bumpSessionEpoch();

        // Soft refresh profile in background — never clear the session on failure.
        void (async () => {
          try {
            const me = await getMe();
            if (signInLockRef.current) {
              // Still in sign-in commit window; apply quietly.
              await setUserSnapshot(me);
              applySession(me, false);
            } else if (isSignedInStatus(statusRef.current)) {
              await setUserSnapshot(me);
              applySession(me, false);
            }
          } catch {
            /* keep the verified OTP/Google session */
          }
        })();
      } finally {
        // Keep lock briefly so concurrent restore/401 cannot undo this commit.
        setTimeout(() => {
          signInLockRef.current = false;
          setAllowAutoClearOn401(true);
        }, 800);
      }
    },
    [applySession, bumpSessionEpoch]
  );

  const signOut = useCallback(async () => {
    signInLockRef.current = false;
    setAllowAutoClearOn401(false);
    try {
      disconnectSocket();
      clearWelcomeSession();
      await clearToken();
      await clearUserSnapshot();
      applySession(null, true);
      bumpSessionEpoch();
    } finally {
      setAllowAutoClearOn401(true);
    }
  }, [applySession, bumpSessionEpoch]);

  const refreshSession = useCallback(async () => {
    await restoreSession();
  }, [restoreSession]);

  const initialRoute = useMemo(
    () => routeForUser(user, status === "signedOut"),
    [user, status]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isRestoring: status === "loading",
      signIn,
      signOut,
      refreshSession,
      initialRoute,
      sessionEpoch
    }),
    [status, user, signIn, signOut, refreshSession, initialRoute, sessionEpoch]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

/** For axios interceptor — sign out without React hook */
export { invokeAuthSignOut };
