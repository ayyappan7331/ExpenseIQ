'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/hooks/queries/keys';

export function useGoals(opts: { context?: string } = {}) {
  const context = opts.context ?? 'Personal';
  return useQuery({
    queryKey: queryKeys.goals.list(context),
    queryFn: () => api.getGoals({ context }),
    staleTime: 30 * 1000,
  });
}
