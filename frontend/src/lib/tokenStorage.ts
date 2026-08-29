// The backend issues access + refresh tokens as plain JSON, not cookies,
// so there is no server-side session to rely on.
// We keep the refresh token in localStorage so a page reload doesn't force
// a fresh login, and keep the access token in memory + localStorage.

const ACCESS_TOKEN_KEY = "0x0A";
const REFRESH_TOKEN_KEY = "0x0R";

export const tokenStorage = {
	getAccessToken(): string | null {
		return localStorage.getItem(ACCESS_TOKEN_KEY);
	},
	setAccessToken(token: string): void {
		localStorage.setItem(ACCESS_TOKEN_KEY, token);
	},
	getRefreshToken(): string | null {
		return localStorage.getItem(REFRESH_TOKEN_KEY);
	},
	setRefreshToken(token: string): void {
		localStorage.setItem(REFRESH_TOKEN_KEY, token);
	},
	setTokenPair(accessToken: string, refreshToken: string): void {
		localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
		localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
	},
	clear(): void {
		localStorage.removeItem(ACCESS_TOKEN_KEY);
		localStorage.removeItem(REFRESH_TOKEN_KEY);
	},
};
