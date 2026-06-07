// Auth token store. Mirrors the pattern in src/lib/api/profile.ts.
// SSR-safe: all localStorage access is guarded by typeof window check.
//
// Token is written on login and cleared on logout or 401.
// Only active when NEXT_PUBLIC_AUTH_ENABLED === 'true'.

export const AUTH_TOKEN_KEY = 'expenseiq_auth_token';
export const AUTH_USER_KEY = 'expenseiq_auth_user';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage.getItem(AUTH_TOKEN_KEY); } catch { return null; }
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(AUTH_TOKEN_KEY, token); } catch { /* ignore */ }
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    window.localStorage.removeItem(AUTH_USER_KEY);
  } catch { /* ignore */ }
}

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  dob?: string;
  purpose?: string;
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) as StoredUser : null;
  } catch { return null; }
}

export function setStoredUser(user: StoredUser): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user)); } catch { /* ignore */ }
}

/** True when auth is enabled via the env flag. */
export function isAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true';
}
