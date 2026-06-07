'use client';

/** Lightweight typed localStorage helpers used by templates, favorites, and pins. */

/**
 * Returns a profile-scoped localStorage key.
 * Prevents cross-profile data leakage for client-side persistence.
 * Example: lsProfileKey('expenseiq_pinned_transactions', 'default')
 *          → 'expenseiq_pinned_transactions__default'
 */
export function lsProfileKey(base: string, profileId: string): string {
  return `${base}__${profileId}`;
}

export function lsGet<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

export function lsSet<T>(key: string, value: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded — silently ignore
  }
}

export function lsGetOne<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function lsSetOne<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded — silently ignore
  }
}
