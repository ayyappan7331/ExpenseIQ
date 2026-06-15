'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/hooks/queries/keys';

export function useSubscriptions(opts: { context?: string } = {}) {
  const context = opts.context ?? 'Personal';
  return useQuery({
    queryKey: queryKeys.subscriptions.list(context),
    queryFn: () => api.getSubscriptions({ context }),
    staleTime: 30 * 1000,
  });
}
