'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financialConfigApi } from '@/lib/api/financialConfig';
import { queryKeys } from '@/lib/hooks/queries/keys';
import { useToast } from '@/components/ui/Toast';
import type { FinancialConfig } from '@/lib/types/api';

/**
 * Fetches FinancialConfig from /api/financial-config.
 * FinancialConfig is the sole source of truth for all financial configuration (E4.10).
 * Settings fallback for financial fields removed — Settings now owns only theme/widgets.
 */
export function useFinancialConfig() {
  const context = 'Personal';

  const query = useQuery({
    queryKey: queryKeys.financialConfig.one(context),
    queryFn: () => financialConfigApi.get({ context }),
    // Retry once on failure; 404 means no config yet (will be created on next write)
    retry: (failureCount, error) => {
      if (error instanceof Error && 'status' in error && (error as { status: number }).status === 404) return false;
      return failureCount < 1;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes — financial config changes infrequently
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

/**
 * Mutation hook for updating FinancialConfig.
 * Uses PATCH / $set semantics — only provided fields are updated.
 */
export function useUpdateFinancialConfig() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const context = 'Personal';

  return useMutation({
    mutationFn: (data: Partial<FinancialConfig>) =>
      financialConfigApi.patch({ ...data, context }),
    onMutate: async (data) => {
      const key = queryKeys.financialConfig.one(context);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<FinancialConfig>(key);
      qc.setQueryData<FinancialConfig>(key, (old) => ({ ...old, context, ...data }));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      const prev = (ctx as { previous?: FinancialConfig } | undefined)?.previous;
      if (prev) qc.setQueryData(queryKeys.financialConfig.one(context), prev);
      toast('Failed to save configuration', 'error');
    },
    onSuccess: () => {
      // Do NOT invalidate — prevents focus-stealing re-render mid-typing.
      // Optimistic update in onMutate already reflects correct state.
    },
  });
}
