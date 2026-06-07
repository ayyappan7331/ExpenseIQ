// Active-profile selector. Mirrors the legacy SPA contract:
//   localStorage['expenseiq_active_profile']  →  the currently-selected profile id
// Same key the legacy app uses, so a user who flips between the two SPAs on
// the same origin keeps the same active profile selection.

import type { ProfileId } from '@/lib/types/api';

export const ACTIVE_PROFILE_KEY = 'expenseiq_active_profile';
export const DEFAULT_PROFILE_ID: ProfileId = 'default';

export function getActiveProfileId(): ProfileId {
  if (typeof window === 'undefined') return DEFAULT_PROFILE_ID;
  try {
    return window.localStorage.getItem(ACTIVE_PROFILE_KEY) || DEFAULT_PROFILE_ID;
  } catch {
    return DEFAULT_PROFILE_ID;
  }
}

export function setActiveProfileId(id: ProfileId): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ACTIVE_PROFILE_KEY, id);
  } catch {
    // localStorage may be unavailable; silently degrade.
  }
}

export function clearActiveProfileId(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(ACTIVE_PROFILE_KEY);
  } catch {
    // ignore
  }
}
