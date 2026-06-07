'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { getActiveProfileId } from '@/lib/api/profile';
import { queryKeys } from '@/lib/hooks/queries/keys';
import type { ProfileId } from '@/lib/types/api';

export function useSettings(opts: { profileId?: ProfileId } = {}) {
  const profileId = opts.profileId ?? getActiveProfileId();
  return useQuery({
    queryKey: queryKeys.settings.one(profileId),
    queryFn: () => api.getSettings({ profileId }),
    staleTime: 5 * 60 * 1000, // 5 minutes — settings change infrequently
  });
}

export function useDbStats() {
  return useQuery({
    queryKey: queryKeys.dbStats,
    queryFn: () => api.getDbStats(),
  });
}
