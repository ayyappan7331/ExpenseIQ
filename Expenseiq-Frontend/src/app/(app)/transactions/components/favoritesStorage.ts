'use client';

// Favorites localStorage fallback helpers.
// Primary persistence is now FinancialConfig (E4.9).
// These helpers are used only as a fallback before the FinancialConfig query resolves.

import { lsGet, lsProfileKey } from '@/lib/utils/localStorage';
import type { FavoriteTransaction } from '@/lib/types/api';

export { type FavoriteTransaction };

export const FAVORITES_BASE_KEY = 'expenseiq_favorite_transactions';

export function favoritesKey(context?: string): string {
  return lsProfileKey(FAVORITES_BASE_KEY, context ?? 'Personal');
}

/** Load favorites from localStorage (fallback only). */
export function loadFavorites(context?: string): FavoriteTransaction[] {
  return lsGet<FavoriteTransaction>(favoritesKey(context)).sort((a, b) => {
    if (a.usageCount !== b.usageCount) return b.usageCount - a.usageCount;
    return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
  });
}

/** Structural match: does a transaction match any saved favorite pattern? */
export function matchesFavorite(
  txn: { type: string; category?: string; subcategory?: string; paymentMethod?: string },
  favorites: { type: string; category: string; subcategory?: string; paymentMethod?: string }[]
): boolean {
  return favorites.some(
    f =>
      f.type === txn.type &&
      (f.category ?? '') === (txn.category ?? '') &&
      (f.subcategory ?? '') === (txn.subcategory ?? '') &&
      (f.paymentMethod ?? '') === (txn.paymentMethod ?? '')
  );
}
