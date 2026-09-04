import type {
	AuthResponse,
	LoginPayload,
	RegisterPayload,
	User,
} from "../types/auth";
import { apiClient } from "./client";

export async function registerRequest(
	payload: RegisterPayload,
): Promise<AuthResponse> {
	const { data } = await apiClient.post<AuthResponse>(
		"/auth/register",
		payload,
	);

	return data;
}

export async function loginRequest(
	payload: LoginPayload,
): Promise<AuthResponse> {
	const { data } = await apiClient.post<AuthResponse>("/auth/login", payload);

	return data;
}

export async function refreshRequest(): Promise<AuthResponse> {
	const { data } = await apiClient.post<AuthResponse>("/auth/refresh");

	return data;
}

export async function logoutRequest(): Promise<void> {
	await apiClient.post("/auth/logout");
}

export async function fetchCurrentUser(): Promise<User> {
	const { data } = await apiClient.get<User>("/users/me");

	return data;
}
