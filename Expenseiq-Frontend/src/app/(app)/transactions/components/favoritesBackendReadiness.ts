'use client';

// Favorites backend readiness helpers — E4.4
//
// Conversion utilities between the current localStorage shape (FavoriteTransaction)
// and the future backend shape (FavoritePattern).
//
// These helpers prepare the migration path without changing current behavior.
// When E4.5 moves favorites to the backend, only the storage layer changes —
// the conversion helpers remain the same.

import type { FavoriteTransaction } from '@/lib/types/api';

/** Minimal pattern shape for structural matching — no display metadata. */
export interface FavoritePattern {
  type: 'income' | 'expense';
  category: string;
  subcategory?: string;
  paymentMethod?: string;
}

/**
 * Extracts the structural match pattern from a full FavoriteTransaction.
 * This is the minimal shape needed for backend persistence.
 */
export function favoriteTransactionToPattern(fav: FavoriteTransaction): FavoritePattern {
  return {
    type: fav.type,
    category: fav.category,
    subcategory: fav.subcategory,
    paymentMethod: fav.paymentMethod,
  };
}

/**
 * Converts all favorites to their pattern shapes.
 * Use this when preparing data for backend persistence.
 */
export function favoritesToPatterns(favorites: FavoriteTransaction[]): FavoritePattern[] {
  return favorites.map(favoriteTransactionToPattern);
}

/**
 * Checks if a transaction matches a FavoritePattern.
 * Equivalent to matchesFavorite but operates on the minimal pattern shape.
 */
export function patternMatchesTxn(
  pattern: FavoritePattern,
  txn: { type: string; category?: string; subcategory?: string; paymentMethod?: string }
): boolean {
  return (
    pattern.type === txn.type &&
    (pattern.category ?? '') === (txn.category ?? '') &&
    (pattern.subcategory ?? '') === (txn.subcategory ?? '') &&
    (pattern.paymentMethod ?? '') === (txn.paymentMethod ?? '')
  );
}

/**
 * Reconstructs a minimal FavoriteTransaction from a FavoritePattern.
 * Used when migrating backend patterns back to the localStorage shape.
 */
export function patternToFavoriteTransaction(
  pattern: FavoritePattern,
  overrides: Partial<FavoriteTransaction> = {}
): FavoriteTransaction {
  return {
    id: overrides.id ?? Date.now().toString(),
    name: overrides.name ?? `${pattern.category}${pattern.subcategory ? ` - ${pattern.subcategory}` : ''}`,
    type: pattern.type,
    category: pattern.category,
    subcategory: pattern.subcategory,
    paymentMethod: pattern.paymentMethod,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    usageCount: overrides.usageCount ?? 1,
    lastUsed: overrides.lastUsed ?? new Date().toISOString(),
  };
}
