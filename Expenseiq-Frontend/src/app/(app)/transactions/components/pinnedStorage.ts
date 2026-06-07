'use client';

// Pinned transactions localStorage fallback helpers.
// Primary persistence is now FinancialConfig (E4.9).
// loadPinnedIds is used only as a fallback before the FinancialConfig query resolves.

import { lsGet, lsProfileKey } from '@/lib/utils/localStorage';
import { getActiveProfileId } from '@/lib/api/profile';

export const PINS_BASE_KEY = 'expenseiq_pinned_transactions';

export function pinsKey(profileId?: string): string {
  return lsProfileKey(PINS_BASE_KEY, profileId ?? getActiveProfileId());
}

/** Load pinned IDs from localStorage (fallback only). */
export function loadPinnedIds(profileId?: string): string[] {
  return lsGet<string>(pinsKey(profileId));
}
