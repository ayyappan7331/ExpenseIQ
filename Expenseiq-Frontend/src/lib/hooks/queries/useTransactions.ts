'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { getActiveProfileId } from '@/lib/api/profile';
import { queryKeys } from '@/lib/hooks/queries/keys';
import type { ProfileId } from '@/lib/types/api';

export function useTransactions(opts: { profileId?: ProfileId; month?: string } = {}) {
  const profileId = opts.profileId ?? getActiveProfileId();
  return useQuery({
    queryKey: queryKeys.transactions.list(profileId, opts.month),
    queryFn: () => api.getTransactions({ profileId, month: opts.month }),
    staleTime: 30 * 1000, // 30 seconds
  });
}
