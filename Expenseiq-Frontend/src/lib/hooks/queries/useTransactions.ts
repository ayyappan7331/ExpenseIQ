'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/hooks/queries/keys';

export function useTransactions(opts: { context?: string; month?: string } = {}) {
  const context = opts.context ?? 'Personal';
  return useQuery({
    queryKey: queryKeys.transactions.list(context, opts.month),
    queryFn: () => api.getTransactions({ context, month: opts.month }),
    staleTime: 30 * 1000, // 30 seconds
  });
}
