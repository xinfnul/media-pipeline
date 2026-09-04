// Just the user object, for rendering an authenticated UI instantly on
// reload instead of a spinner. This is not a security boundary — it's
// purely a UX cache — so localStorage is fine here even though it isn't
// for tokens. AuthContext always re-verifies against the server
// (POST /auth/refresh) and overwrites/clears this if it's stale or wrong.

import type { User } from "@/types/auth";

const USER_CACHE_KEY = "mp_cached_user";

export const userCache = {
  get(): User | null {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },
  set(user: User): void {
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
  },
  clear(): void {
    localStorage.removeItem(USER_CACHE_KEY);
  },
};
