'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/hooks/queries/keys';

export function useDebts(opts: { context?: string } = {}) {
  const context = opts.context ?? 'Personal';
  return useQuery({
    queryKey: queryKeys.debts.list(context),
    queryFn: () => api.getDebts({ context }),
    staleTime: 30 * 1000,
  });
}
