'use client';

import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { financialConfigApi } from '@/lib/api/financialConfig';
import { getActiveProfileId } from '@/lib/api/profile';
import { queryKeys } from '@/lib/hooks/queries/keys';
import { useFinancialConfig } from '@/lib/hooks/useFinancialConfig';
import { loadPinnedIds } from './pinnedStorage';
import type { FinancialConfig } from '@/lib/types/api';

export function usePinnedTransactions() {
  const profileId = getActiveProfileId();
  const qc = useQueryClient();
  const { data: config } = useFinancialConfig();
  const fcKey = queryKeys.financialConfig.one(profileId);

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

    financialConfigApi.patch({ profileId, pinnedTransactionIds: next })
      .then(() => qc.invalidateQueries({ queryKey: fcKey }))
      .catch(() => qc.invalidateQueries({ queryKey: fcKey }));
  }, [profileId, qc, fcKey]);

  const clearPins = useCallback(() => {
    qc.setQueryData<FinancialConfig>(fcKey, (old) =>
      old ? { ...old, pinnedTransactionIds: [] } : old
    );
    financialConfigApi.patch({ profileId, pinnedTransactionIds: [] })
      .then(() => qc.invalidateQueries({ queryKey: fcKey }))
      .catch(() => qc.invalidateQueries({ queryKey: fcKey }));
  }, [profileId, qc, fcKey]);

  return { pinnedIds, isPinned, togglePin, clearPins, pinnedCount: pinnedIds.size };
}
