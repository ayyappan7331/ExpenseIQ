'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { financialConfigApi } from '@/lib/api/financialConfig';
import { getActiveProfileId } from '@/lib/api/profile';
import { queryKeys } from '@/lib/hooks/queries/keys';
import { useFinancialConfig } from '@/lib/hooks/useFinancialConfig';
import { useToast } from '@/components/ui/Toast';
import type { FinancialConfig } from '@/lib/types/api';

/**
 * System-managed income categories that are always available regardless
 * of what the user has defined in FinancialConfig.
 * These are used by useRecordPayment (CC payments) and cashback recording
 * so they must always appear in the category dropdown and search filters.
 */
const SYSTEM_INCOME_CATEGORIES = ['Credit Card Payment', 'Cashback'] as const;

/** Returns user-defined categories merged with system categories. Reads from FinancialConfig. */
export function useCategories() {
  const { data, isLoading } = useFinancialConfig();
  const userExpenseCategories = data?.customExpenseCategories || [];
  const userIncomeCategories  = data?.customIncomeCategories  || [];

  // Merge system categories at the end, deduplicating if the user happened
  // to add them manually.
  const incomeCategories = [
    ...userIncomeCategories,
    ...SYSTEM_INCOME_CATEGORIES.filter(s => !userIncomeCategories.includes(s)),
  ];

  return { expenseCategories: userExpenseCategories, incomeCategories, isLoading };
}

export function useCategoryMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const profileId = getActiveProfileId();
  const key = queryKeys.financialConfig.one(profileId);

  return useMutation({
    mutationFn: (data: { customExpenseCategories: string[]; customIncomeCategories: string[] }) =>
      financialConfigApi.patch({ ...data, profileId }),
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<FinancialConfig>(key);
      qc.setQueryData<FinancialConfig>(key, (old) => ({ ...old, profileId, ...data }));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      const prev = (ctx as { previous?: FinancialConfig } | undefined)?.previous;
      if (prev) qc.setQueryData(key, prev);
      toast('Failed to save categories', 'error');
    },
    onSuccess: () => {
      // Do NOT invalidate here — invalidation triggers a refetch which causes
      // a re-render that steals focus from the input the user is still typing in.
      // The optimistic update in onMutate already reflects the correct state.
      // The query will naturally refetch when it becomes stale (5 min staleTime).
      toast('Categories saved');
    },
  });
}
