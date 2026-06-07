'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/hooks/queries/keys';

export function useProfiles() {
  return useQuery({
    queryKey: queryKeys.profiles.list(),
    queryFn: () => api.getProfiles(),
    staleTime: 30 * 1000,
  });
}
