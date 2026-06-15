'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/hooks/queries/keys';

export function useCreditCards(opts: { context?: string } = {}) {
  const context = opts.context ?? 'Personal';
  return useQuery({
    queryKey: queryKeys.creditCards.list(context),
    queryFn: () => api.getCreditCards({ context }),
    staleTime: 30 * 1000,
  });
}

export function useArchivedCreditCards(opts: { context?: string } = {}) {
  const context = opts.context ?? 'Personal';
  return useQuery({
    queryKey: [...queryKeys.creditCards.list(context), 'archived'],
    queryFn: () => api.getArchivedCreditCards({ context }),
    staleTime: 30 * 1000,
  });
}
