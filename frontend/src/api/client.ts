import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { accessTokenStore } from "@/lib/accessTokenStore";
import { userCache } from "@/lib/userCache";
import type { ApiErrorBody, AuthResponse } from "@/types/auth";

const baseURL = import.meta.env.VITE_API_URL;

// withCredentials is required for the browser to send/receive the httpOnly
// refresh-token cookie on cross-origin requests (frontend:5173 -> backend:3000).
export const apiClient = axios.create({ baseURL, withCredentials: true });

// A plain axios instance (no interceptors) used only for the refresh call
// itself, so a failed refresh can never trigger another refresh attempt.
const refreshClient = axios.create({ baseURL, withCredentials: true });

// Attach the current access token to every outgoing request.
apiClient.interceptors.request.use((config) => {
  const token = accessTokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Extended config so we can mark a request as "already retried once".
interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

// If several things need a refresh at the same time (a proactive timer
// firing at the same moment a request 401s, or several requests 401ing
// together) we only want ONE call to POST /auth/refresh — the backend
// rotates the refresh token and treats reuse of an old one as a stolen
// token, revoking the whole session. Concurrent calls would trip that.
let refreshInFlight: Promise<AuthResponse> | null = null;

async function performRefresh(): Promise<AuthResponse> {
  // No body: the refresh token travels as an httpOnly cookie that the
  // browser attaches automatically because of withCredentials above.
  const { data } = await refreshClient.post<AuthResponse>("/auth/refresh");

  accessTokenStore.set(data.access_token, data.expires_in);
  userCache.set(data.user);
  return data;
}

/** Refreshes the access token, coalescing concurrent callers into one call. */
export function refreshAccessToken(): Promise<AuthResponse> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

// Called by AuthContext on logout / forced sign-out so other tabs/consumers
// can react without importing the context into this module.
let onAuthExpired: (() => void) | null = null;
export function setOnAuthExpired(handler: () => void): void {
  onAuthExpired = handler;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const originalRequest = error.config as RetriableConfig | undefined;
    const isAuthEndpoint = originalRequest?.url?.includes("/auth/");

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retried &&
      !isAuthEndpoint
    ) {
      originalRequest._retried = true;

      try {
        const auth = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${auth.access_token}`;
        return apiClient(originalRequest);
      } catch {
        accessTokenStore.clear();
        userCache.clear();
        onAuthExpired?.();
      }
    }

    return Promise.reject(error);
  },
);

export function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ApiErrorBody | undefined;
    if (body?.error?.message) {
      return body.error.message;
    }
  }
  return fallback;
}
