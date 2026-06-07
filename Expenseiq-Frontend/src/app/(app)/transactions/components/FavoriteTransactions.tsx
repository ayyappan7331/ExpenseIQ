'use client';

import { useEffect, useCallback } from 'react';
import { Heart, Plus } from 'lucide-react';
import { Button } from '@/components/ui';
import { financialConfigApi } from '@/lib/api/financialConfig';
import { getActiveProfileId } from '@/lib/api/profile';
import { queryKeys } from '@/lib/hooks/queries/keys';
import { useFinancialConfig } from '@/lib/hooks/useFinancialConfig';
import { useQueryClient } from '@tanstack/react-query';
import { loadFavorites } from './favoritesStorage';
import type { Transaction, FavoriteTransaction, FinancialConfig } from '@/lib/types/api';
import { useState } from 'react';

interface FavoriteTransactionsProps {
  onUseTransaction: (transaction: Partial<Transaction>) => void;
  className?: string;
}

export function FavoriteTransactions({ onUseTransaction, className }: FavoriteTransactionsProps) {
  const profileId = getActiveProfileId();
  const qc = useQueryClient();
  const { data: config } = useFinancialConfig();
  const fcKey = queryKeys.financialConfig.one(profileId);
  const [showAll, setShowAll] = useState(false);

  // Prefer FinancialConfig; fall back to localStorage for first render
  const favorites: FavoriteTransaction[] = config?.favoriteTransactions
    ?? loadFavorites().map(f => ({
        id: f.id, name: f.name, type: f.type, category: f.category,
        subcategory: f.subcategory, paymentMethod: f.paymentMethod,
        notes: f.notes, amount: f.amount, createdAt: f.createdAt,
        usageCount: f.usageCount, lastUsed: f.lastUsed,
      }));

  const patchFavorites = useCallback((next: FavoriteTransaction[]) => {
    qc.setQueryData<FinancialConfig>(fcKey, (old) =>
      old ? { ...old, favoriteTransactions: next } : old
    );
    financialConfigApi.patch({ profileId, favoriteTransactions: next })
      .then(() => qc.invalidateQueries({ queryKey: fcKey }))
      .catch(() => qc.invalidateQueries({ queryKey: fcKey }));
  }, [profileId, qc, fcKey]);

  const addToFavorites = useCallback((transaction: Transaction, customName?: string) => {
    const isDuplicate = favorites.some(
      f =>
        f.type === transaction.type &&
        (f.category ?? '') === (transaction.category ?? '') &&
        (f.subcategory ?? '') === (transaction.subcategory ?? '') &&
        (f.paymentMethod ?? '') === (transaction.paymentMethod ?? '')
    );
    if (isDuplicate) return;

    const favorite: FavoriteTransaction = {
      id: Date.now().toString(),
      name: customName || `${transaction.category}${transaction.subcategory ? ` - ${transaction.subcategory}` : ''}`,
      type: transaction.type,
      category: transaction.category || '',
      subcategory: transaction.subcategory,
      paymentMethod: transaction.paymentMethod,
      paymentApp: transaction.paymentApp,
      notes: transaction.notes,
      amount: transaction.amount,
      createdAt: new Date().toISOString(),
      usageCount: 1,
      lastUsed: new Date().toISOString(),
    };
    patchFavorites([favorite, ...favorites]);
  }, [favorites, patchFavorites]);

  // Expose addToFavorites on window for external callers
  useEffect(() => {
    type Handler = (t: Transaction, n?: string) => void;
    (window as unknown as { addTransactionToFavorites?: Handler }).addTransactionToFavorites = addToFavorites;
    return () => {
      delete (window as unknown as { addTransactionToFavorites?: Handler }).addTransactionToFavorites;
    };
  }, [addToFavorites]);

  const handleUseFavorite = (favorite: FavoriteTransaction) => {
    const updated = favorites.map(f =>
      f.id === favorite.id
        ? { ...f, usageCount: f.usageCount + 1, lastUsed: new Date().toISOString() }
        : f
    );
    patchFavorites(updated);
    onUseTransaction({
      type: favorite.type,
      category: favorite.category,
      subcategory: favorite.subcategory,
      paymentMethod: favorite.paymentMethod,
      paymentApp: favorite.paymentApp,
      notes: favorite.notes,
      amount: favorite.amount,
    });
  };

  if (favorites.length === 0) return null;

  const displayed = showAll ? favorites : favorites.slice(0, 4);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-text flex items-center gap-1.5">
          <Heart className="w-3.5 h-3.5 text-red-500" />
          Quick Access
        </h3>
        {favorites.length > 4 && (
          <Button size="sm" variant="ghost" onClick={() => setShowAll(!showAll)} className="text-xs">
            {showAll ? 'Show Less' : `+${favorites.length - 4} more`}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {displayed.map((favorite) => (
          <button
            key={favorite.id}
            onClick={() => handleUseFavorite(favorite)}
            className="flex items-center justify-between p-2.5 bg-bg-2 rounded-lg border border-card-border hover:bg-bg-3 hover:border-accent/30 transition-all text-left group"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  favorite.type === 'income' ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="text-xs font-medium text-text truncate">{favorite.name}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-text-3">
                <span>{favorite.paymentMethod || 'No method'}</span>
                {favorite.usageCount > 1 && (
                  <>
                    <span>•</span>
                    <span>{favorite.usageCount}x used</span>
                  </>
                )}
              </div>
            </div>
            <Plus className="w-3.5 h-3.5 text-text-3 group-hover:text-accent transition-colors flex-shrink-0 ml-2" />
          </button>
        ))}
      </div>
    </div>
  );
}

export function addTransactionToFavorites(transaction: Transaction, customName?: string): void {
  if (typeof window === 'undefined') return;
  type Handler = (t: Transaction, n?: string) => void;
  const handler = (window as unknown as { addTransactionToFavorites?: Handler }).addTransactionToFavorites;
  handler?.(transaction, customName);
}
