import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { tokenStorage } from "../lib/tokenStorage";
import type { ApiErrorBody, AuthResponse } from "../types/auth";

const baseURL = import.meta.env.VITE_API_URL;

export const apiClient = axios.create({ baseURL });

// A plain axios instance ( no interceptors ) used only for refresh call
// itself, so a failed refresh can never trigger another refresh attempt.
const refreshClient = axios.create({ baseURL });

// Attach the current access token to every ouytgoing request.
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
	const token = tokenStorage.getAccessToken();

	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}

	return config;
});

// Extended config so we can mark a request as "already tried once".
interface RetriableConfig extends InternalAxiosRequestConfig {
	_retried?: boolean;
}

// If several requests 401 at the same time, only one refresh call and
// let the rest wait on it.
let refreshInFlight: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
	const refreshToken = tokenStorage.getRefreshToken();

	if (!refreshToken) {
		throw new Error("no refresh token available");
	}

	const { data } = await refreshClient.post<AuthResponse>("/auth/refresh", {
		refresh_token: refreshToken,
	});

	tokenStorage.setTokenPair(data.access_token, data.refresh_token);

	return data.access_token;
}

// Called by AuthContext on logout / forced sign-out so other tabs
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
				if (!refreshInFlight) {
					refreshInFlight = refreshAccessToken().finally(() => {
						refreshInFlight = null;
					});
				}

				const newAccessToken = await refreshInFlight;

				originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

				return apiClient(originalRequest);
			} catch {
				tokenStorage.clear();
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
