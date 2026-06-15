'use client';

import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { financialConfigApi } from '@/lib/api/financialConfig';
import { queryKeys } from '@/lib/hooks/queries/keys';
import { useFinancialConfig } from '@/lib/hooks/useFinancialConfig';
import { loadPinnedIds } from './pinnedStorage';
import type { FinancialConfig } from '@/lib/types/api';

export function usePinnedTransactions() {
  const context = 'Personal';
  const qc = useQueryClient();
  const { data: config } = useFinancialConfig();
  const fcKey = queryKeys.financialConfig.one(context);

  // Prefer FinancialConfig; fall back to localStorage for first render before query resolves
  const pinnedIds = useMemo(
    () => new Set<string>(config?.pinnedTransactionIds ?? loadPinnedIds()),
    [config?.pinnedTransactionIds]
  );

  const isPinned = useCallback((id: string) => pinnedIds.has(id), [pinnedIds]);

  const togglePin = useCallback((id: string) => {
    const current = qc.getQueryData<FinancialConfig>(fcKey);
    const currentIds = current?.pinnedTransactionIds ?? loadPinnedIds();
    const next = currentIds.includes(id)
      ? currentIds.filter(p => p !== id)
      : [...currentIds, id];

    // Optimistic update
    qc.setQueryData<FinancialConfig>(fcKey, (old) =>
      old ? { ...old, pinnedTransactionIds: next } : old
    );

    financialConfigApi.patch({ context, pinnedTransactionIds: next })
      .then(() => qc.invalidateQueries({ queryKey: fcKey }))
      .catch(() => qc.invalidateQueries({ queryKey: fcKey }));
  }, [context, qc, fcKey]);

  const clearPins = useCallback(() => {
    qc.setQueryData<FinancialConfig>(fcKey, (old) =>
      old ? { ...old, pinnedTransactionIds: [] } : old
    );
    financialConfigApi.patch({ context, pinnedTransactionIds: [] })
      .then(() => qc.invalidateQueries({ queryKey: fcKey }))
      .catch(() => qc.invalidateQueries({ queryKey: fcKey }));
  }, [context, qc, fcKey]);

  return { pinnedIds, isPinned, togglePin, clearPins, pinnedCount: pinnedIds.size };
}
