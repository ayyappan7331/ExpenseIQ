'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/hooks/queries/keys';

export function useSettings(opts: { context?: string } = {}) {
  const context = opts.context ?? 'Personal';
  return useQuery({
    queryKey: queryKeys.settings.one(context),
    queryFn: () => api.getSettings({ context }),
    staleTime: 5 * 60 * 1000, // 5 minutes — settings change infrequently
  });
}

export function useDbStats() {
  return useQuery({
    queryKey: queryKeys.dbStats,
    queryFn: () => api.getDbStats(),
  });
}
