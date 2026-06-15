'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { financialConfigApi } from '@/lib/api/financialConfig';
import { queryKeys } from '@/lib/hooks/queries/keys';
import { useFinancialConfig } from '@/lib/hooks/useFinancialConfig';
import { useToast } from '@/components/ui/Toast';
import type { FinancialConfig } from '@/lib/types/api';

export function useSubcategories() {
  const { data, isLoading } = useFinancialConfig();
  const map: Record<string, string[]> = data?.subcategoryMap || {};
  function getFor(category: string): string[] { return map[category] || []; }
  return { map, getFor, isLoading };
}

export function useSubcategoryMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const context = 'Personal';
  const key = queryKeys.financialConfig.one(context);

  return useMutation({
    mutationFn: (subcategoryMap: Record<string, string[]>) =>
      financialConfigApi.patch({ subcategoryMap, context }),
    onMutate: async (subcategoryMap) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<FinancialConfig>(key);
      qc.setQueryData<FinancialConfig>(key, (old) => ({ ...old, context, subcategoryMap }));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      const prev = (ctx as { previous?: FinancialConfig } | undefined)?.previous;
      if (prev) qc.setQueryData(key, prev);
      toast('Failed to save subcategories', 'error');
    },
    onSuccess: () => {
      // Do NOT invalidate — prevents focus-stealing re-render mid-typing.
      toast('Subcategories saved');
    },
  });
}
