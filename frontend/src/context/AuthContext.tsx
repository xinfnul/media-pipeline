import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useReducer,
	type ReactNode,
} from "react";
import type { LoginPayload, RegisterPayload, User } from "../types/auth";
import { extractErrorMessage, setOnAuthExpired } from "../api/client";
import {
	fetchCurrentUser,
	loginRequest,
	logoutRequest,
	refreshRequest,
	registerRequest,
} from "../api/auth";
import { tokenStorage } from "../lib/tokenStorage";

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
	const [state, dispatch] = useReducer(authReducer, {
		user: null,
		status: "checking",
	});

	const clearSession = useCallback(() => {
		tokenStorage.clear();
		dispatch({ type: "AUTH_CLEARED" });
	}, []);

	// Give the axios interceptor a way to force into a logged-out state
	// if a refresh attempt ever fails.
	useEffect(() => {
		setOnAuthExpired(clearSession);
	}, [clearSession]);

	// On first load, try to restore a session from whatever is in storage
	// rather than trustinf the access token blindly: refres first, then
	// confirm identity against /users/me.
	useEffect(() => {
		async function bootstrap() {
			const refreshToken = tokenStorage.getRefreshToken();

			if (!refreshToken) {
				dispatch({ type: "AUTH_CLEARED" });
				return;
			}

			try {
				const auth = await refreshRequest(refreshToken);
				tokenStorage.setTokenPair(auth.access_token, auth.refresh_token);
				dispatch({ type: "AUTH_SUCCESS", user: auth.user });
			} catch {
				tokenStorage.clear();
				dispatch({ type: "AUTH_CLEARED" });
			}
		}

		bootstrap();
	}, []);

	const login = useCallback(async (payload: LoginPayload) => {
		const auth = await loginRequest(payload);
		tokenStorage.setTokenPair(auth.access_token, auth.refresh_token);
		dispatch({ type: "AUTH_SUCCESS", user: auth.user });
	}, []);

	const register = useCallback(async (payload: RegisterPayload) => {
		const auth = await registerRequest(payload);
		tokenStorage.setTokenPair(auth.access_token, auth.refresh_token);
		dispatch({ type: "AUTH_SUCCESS", user: auth.user });
	}, []);

	const logout = useCallback(async () => {
		const refreshToken = tokenStorage.getRefreshToken();

		try {
			if (refreshToken) {
				await logoutRequest(refreshToken);
			}
		} catch {
		} finally {
			clearSession();
		}
	}, [clearSession]);

	return (
		<AuthContext.Provider
			value={{
				user: state.user,
				status: state.status,
				login,
				register,
				logout,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth(): AuthContextValue {
	const ctx = useContext(AuthContext);

	if (!ctx) {
		throw new Error("useAuth must be within an AuthProvider");
	}

	return ctx;
}

export { extractErrorMessage };

export { fetchCurrentUser };
