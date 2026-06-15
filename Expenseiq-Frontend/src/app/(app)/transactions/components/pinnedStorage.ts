'use client';

// Pinned transactions localStorage fallback helpers.
// Primary persistence is now FinancialConfig (E4.9).
// loadPinnedIds is used only as a fallback before the FinancialConfig query resolves.

import { lsGet, lsProfileKey } from '@/lib/utils/localStorage';
export const PINS_BASE_KEY = 'expenseiq_pinned_transactions';

export function pinsKey(context?: string): string {
  return lsProfileKey(PINS_BASE_KEY, context ?? 'Personal');
}

/** Load pinned IDs from localStorage (fallback only). */
export function loadPinnedIds(context?: string): string[] {
  return lsGet<string>(pinsKey(context));
}
