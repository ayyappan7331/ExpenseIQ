'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/hooks/queries/keys';

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: () => api.health(),
    // Health pings have value even when stale — don't dedupe across navigations.
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useVersion() {
  return useQuery({
    queryKey: queryKeys.version,
    queryFn: () => api.version(),
    // Version is essentially immutable for the life of the page.
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
