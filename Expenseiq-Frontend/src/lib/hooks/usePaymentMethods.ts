'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { financialConfigApi } from '@/lib/api/financialConfig';
import { queryKeys } from '@/lib/hooks/queries/keys';
import { useFinancialConfig } from '@/lib/hooks/useFinancialConfig';
import { useToast } from '@/components/ui/Toast';
import type { FinancialConfig } from '@/lib/types/api';

export function usePaymentMethods() {
  const { data, isLoading } = useFinancialConfig();
  const paymentMethods = data?.customPaymentMethods || [];
  return { paymentMethods, isLoading };
}

export function usePaymentMethodMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const context = 'Personal';
  const key = queryKeys.financialConfig.one(context);

  return useMutation({
    mutationFn: (customPaymentMethods: string[]) =>
      financialConfigApi.patch({ customPaymentMethods, context }),
    onMutate: async (customPaymentMethods) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<FinancialConfig>(key);
      qc.setQueryData<FinancialConfig>(key, (old) => ({ ...old, context, customPaymentMethods }));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      const prev = (ctx as { previous?: FinancialConfig } | undefined)?.previous;
      if (prev) qc.setQueryData(key, prev);
      toast('Failed to save payment methods', 'error');
    },
    onSuccess: () => {
      // Do NOT invalidate — prevents focus-stealing re-render mid-typing.
      toast('Payment methods saved');
    },
  });
}
