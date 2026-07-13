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
  /** Bumps on sign-in / sign-out so the root navigator remounts reliably */
  sessionEpoch: number;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function routeForUser(user: MeUser | null, signedOut: boolean): RootAuthRoute {
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

async function prewarmSocket() {
  try {
    await getSocket();
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
  const userRef = useRef<MeUser | null>(null);
  userRef.current = user;

  const applySession = useCallback((nextUser: MeUser | null, signedOut: boolean) => {
    setUser(nextUser);
    setStatus(statusForUser(nextUser, signedOut));
    if (!signedOut && nextUser?.status === "APPROVED") {
      prewarmSocket();
    }
  }, []);

  const restoreSession = useCallback(async () => {
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
        disconnectSocket();
        await clearToken();
        await clearUserSnapshot();
        applySession(null, true);
      } else if (httpStatus === 403) {
        const snapshot = await getUserSnapshot();
        if (snapshot) {
          applySession(snapshot, false);
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
      disconnectSocket();
      await clearToken();
      await clearUserSnapshot();
      applySession(null, true);
    });
    return () => {
      registerAuthSignOut(async () => {
        await clearToken();
        await clearUserSnapshot();
      });
    };
  }, [applySession]);

  useEffect(() => {
    let resumeTimer: ReturnType<typeof setTimeout> | null = null;
    const onAppState = (next: AppStateStatus) => {
      if (next === "active" && bootstrapDone.current && status === "home") {
        if (resumeTimer) clearTimeout(resumeTimer);
        resumeTimer = setTimeout(() => {
          restoreSession().catch(() => {});
        }, 400);
      }
    };
    const sub = AppState.addEventListener("change", onAppState);
    return () => {
      if (resumeTimer) clearTimeout(resumeTimer);
      sub.remove();
    };
  }, [restoreSession, status]);

  const signIn = useCallback(
    async (accessToken: string, userFromApi: MeUser) => {
      beginWelcomeSession();
      await setToken(accessToken);
      await setUserSnapshot(userFromApi);
      applySession(userFromApi, false);
      setSessionEpoch((n) => n + 1);
    },
    [applySession]
  );

  const signOut = useCallback(async () => {
    setAllowAutoClearOn401(false);
    try {
      disconnectSocket();
      clearWelcomeSession();
      await clearToken();
      await clearUserSnapshot();
      applySession(null, true);
      setSessionEpoch((n) => n + 1);
    } finally {
      setAllowAutoClearOn401(true);
    }
  }, [applySession]);

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
