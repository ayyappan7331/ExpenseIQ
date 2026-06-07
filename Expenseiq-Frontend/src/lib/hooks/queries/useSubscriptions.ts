'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { getActiveProfileId } from '@/lib/api/profile';
import { queryKeys } from '@/lib/hooks/queries/keys';
import type { ProfileId } from '@/lib/types/api';

export function useSubscriptions(opts: { profileId?: ProfileId } = {}) {
  const profileId = opts.profileId ?? getActiveProfileId();
  return useQuery({
    queryKey: queryKeys.subscriptions.list(profileId),
    queryFn: () => api.getSubscriptions({ profileId }),
    staleTime: 30 * 1000,
  });
}
