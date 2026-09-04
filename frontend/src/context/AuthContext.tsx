import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";
import type { ReactNode } from "react";
import { fetchCurrentUser, loginRequest, logoutRequest, registerRequest } from "@/api/auth";
import { extractErrorMessage, refreshAccessToken, setOnAuthExpired } from "@/api/client";
import { accessTokenStore } from "@/lib/accessTokenStore";
import { userCache } from "@/lib/userCache";
import type { AuthResponse, LoginPayload, RegisterPayload, User } from "@/types/auth";

// Refresh proactively a little before the access token actually expires,
// so a normal request never has to eat a 401-then-retry round trip.
const REFRESH_BUFFER_MS = 30_000;

interface AuthState {
  user: User | null;
  status: "checking" | "authenticated" | "unauthenticated";
}

type AuthAction =
  | { type: "AUTH_SUCCESS"; user: User }
  | { type: "AUTH_CLEARED" };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "AUTH_SUCCESS":
      return { user: action.user, status: "authenticated" };
    case "AUTH_CLEARED":
      return { user: null, status: "unauthenticated" };
    default:
      return state;
  }
}

interface AuthContextValue {
  user: User | null;
  status: AuthState["status"];
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const cachedUser = userCache.get();

  const [state, dispatch] = useReducer(authReducer, {
    // Render as authenticated immediately if we have a cached user, so a
    // reload doesn't flash a spinner. The bootstrap effect below still
    // verifies this for real via the server and corrects it if it's wrong.
    // Note this is a UX cache only — it grants no actual access; every
    // real request still needs a valid access token from the server.
    user: cachedUser,
    status: cachedUser ? "authenticated" : "checking",
  } as AuthState);

  const refreshTimerRef = useRef<number | null>(null);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const clearSession = useCallback(() => {
    clearRefreshTimer();
    accessTokenStore.clear();
    userCache.clear();
    dispatch({ type: "AUTH_CLEARED" });
  }, [clearRefreshTimer]);

  const applyAuthResponse = useCallback((auth: AuthResponse) => {
    accessTokenStore.set(auth.access_token, auth.expires_in);
    userCache.set(auth.user);
    dispatch({ type: "AUTH_SUCCESS", user: auth.user });
  }, []);

  // Schedules a single proactive refresh ~30s before the access token
  // expires, and reschedules itself off the new expiry each time it fires.
  const scheduleProactiveRefresh = useCallback(
    (expiresAt: number) => {
      clearRefreshTimer();
      const delay = Math.max(expiresAt - Date.now() - REFRESH_BUFFER_MS, 0);

      refreshTimerRef.current = window.setTimeout(async () => {
        try {
          const auth = await refreshAccessToken();
          dispatch({ type: "AUTH_SUCCESS", user: auth.user });
          scheduleProactiveRefresh(Date.now() + auth.expires_in * 1000);
        } catch {
          clearSession();
        }
      }, delay);
    },
    [clearRefreshTimer, clearSession],
  );

  // Give the axios interceptor a way to force us into a logged-out state
  // if a reactive refresh (triggered by some request's 401) ever fails.
  useEffect(() => {
    setOnAuthExpired(clearSession);
  }, [clearSession]);

  // On mount: the access token lives only in memory, so a reload always
  // wipes it — there is nothing to "check" locally. The refresh token is
  // an httpOnly cookie we can't read either, so the only way to know if
  // there's a valid session is to ask the server:
  //
  //   POST /auth/refresh   (cookie attached automatically by the browser)
  //
  // If there's no cookie, or it's expired/revoked, this simply 401s and we
  // fall through to "unauthenticated" — exactly as it should.
  useEffect(() => {
    async function bootstrap() {
      try {
        const auth = await refreshAccessToken();
        dispatch({ type: "AUTH_SUCCESS", user: auth.user });
        scheduleProactiveRefresh(Date.now() + auth.expires_in * 1000);
      } catch {
        clearSession();
      }
    }

    bootstrap();
    return clearRefreshTimer;
    // Runs once on mount by design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A laptop going to sleep pauses setTimeout, so the proactive timer above
  // can miss its window. When the tab becomes visible again, check whether
  // the token is already expired (or about to be) and catch up immediately
  // rather than waiting for a request to fail first.
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      if (accessTokenStore.get() === null) return; // not logged in, nothing to refresh

      const expiresAt = accessTokenStore.getExpiresAt();
      if (expiresAt !== null && expiresAt - Date.now() <= REFRESH_BUFFER_MS) {
        refreshAccessToken()
          .then((auth) => {
            dispatch({ type: "AUTH_SUCCESS", user: auth.user });
            scheduleProactiveRefresh(Date.now() + auth.expires_in * 1000);
          })
          .catch(clearSession);
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [clearSession, scheduleProactiveRefresh]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const auth = await loginRequest(payload);
      applyAuthResponse(auth);
      scheduleProactiveRefresh(Date.now() + auth.expires_in * 1000);
    },
    [applyAuthResponse, scheduleProactiveRefresh],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const auth = await registerRequest(payload);
      applyAuthResponse(auth);
      scheduleProactiveRefresh(Date.now() + auth.expires_in * 1000);
    },
    [applyAuthResponse, scheduleProactiveRefresh],
  );

  const logout = useCallback(async () => {
    try {
      // Cookie attached automatically; backend revokes it server-side.
      await logoutRequest();
    } catch {
      // Even if the server call fails, drop the local session.
    } finally {
      clearSession();
    }
  }, [clearSession]);

  return (
    <AuthContext.Provider
      value={{ user: state.user, status: state.status, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

export { extractErrorMessage };
export { fetchCurrentUser };
