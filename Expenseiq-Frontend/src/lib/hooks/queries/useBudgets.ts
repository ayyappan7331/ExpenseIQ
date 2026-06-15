'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/hooks/queries/keys';

export function useBudgets(opts: { context?: string; month?: string } = {}) {
  const context = opts.context ?? 'Personal';
  return useQuery({
    queryKey: queryKeys.budgets.list(context, opts.month),
    queryFn: () => api.getBudgets({ context, month: opts.month }),
    staleTime: 30 * 1000, // 30 seconds
  });
}
