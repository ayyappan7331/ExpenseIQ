'use client';

import { useMemo } from 'react';
import { useFinancialConfig } from '@/lib/hooks/useFinancialConfig';
import { loadFavorites, matchesFavorite } from './favoritesStorage';

/**
 * Returns a Set of transaction IDs that structurally match any saved favorite.
 * Reads from FinancialConfig (backend-persisted); falls back to localStorage.
 */
export function useFavoriteIds(
  transactions: { id: string; category?: string; subcategory?: string; type: string; paymentMethod?: string }[]
) {
  const { data: config } = useFinancialConfig();

  const favoriteIds = useMemo(() => {
    // Prefer FinancialConfig; fall back to localStorage
    const favorites = config?.favoriteTransactions ?? loadFavorites();
    if (!favorites.length) return new Set<string>();

    return new Set<string>(
      transactions
        .filter(txn => matchesFavorite(txn, favorites))
        .map(t => t.id)
    );
  }, [transactions, config?.favoriteTransactions]);

  return { favoriteIds };
}
