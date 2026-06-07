'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { getActiveProfileId } from '@/lib/api/profile';
import { queryKeys } from '@/lib/hooks/queries/keys';
import type { ProfileId } from '@/lib/types/api';

export function useCreditCards(opts: { profileId?: ProfileId } = {}) {
  const profileId = opts.profileId ?? getActiveProfileId();
  return useQuery({
    queryKey: queryKeys.creditCards.list(profileId),
    queryFn: () => api.getCreditCards({ profileId }),
    staleTime: 30 * 1000,
  });
}

export function useArchivedCreditCards(opts: { profileId?: ProfileId } = {}) {
  const profileId = opts.profileId ?? getActiveProfileId();
  return useQuery({
    queryKey: [...queryKeys.creditCards.list(profileId), 'archived'],
    queryFn: () => api.getArchivedCreditCards({ profileId }),
    staleTime: 30 * 1000,
  });
}
