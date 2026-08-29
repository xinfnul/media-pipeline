export interface User {
	id: string;
	email: string;
	is_verified: boolean;
	created_at: string;
}

export interface AuthResponse {
	access_token: string;
	refresh_token: string;
	token_type: "Bearer";
	expires_in: number;
	user: User;
}

export interface RegisterPayload {
	email: string;
	password: string;
}

export interface LoginPayload {
	email: string;
	password: string;
}

export interface ApiErrorBody {
	error: {
		message: string;
		status: number;
	};
}
