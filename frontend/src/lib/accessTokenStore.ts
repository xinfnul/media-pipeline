// The access token now lives ONLY in memoty - never localStorage, never a
// non-httpOnly cookie.

let accessToken: string | null = null;
let expiresAt: number | null = null;

export const accessTokenStore = {
	get(): string | null {
		return accessToken;
	},
	getExpiresAt(): number | null {
		return expiresAt;
	},
	isExpired(): boolean {
		return expiresAt === null || Date.now() >= expiresAt;
	},
	/** @param expiresInSeconds TTL from the backend's `expires_in` field. */
	set(token: string, expiresInSeconds: number): void {
		accessToken = token;
		expiresAt = Date.now() + expiresInSeconds * 1000;
	},
	clear(): void {
		accessToken = null;
		expiresAt = null;
	},
};
