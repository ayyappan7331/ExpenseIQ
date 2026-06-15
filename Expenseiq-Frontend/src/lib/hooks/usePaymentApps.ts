'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { financialConfigApi } from '@/lib/api/financialConfig';
import { queryKeys } from '@/lib/hooks/queries/keys';
import { useFinancialConfig } from '@/lib/hooks/useFinancialConfig';
import { useToast } from '@/components/ui/Toast';
import type { FinancialConfig } from '@/lib/types/api';

export function usePaymentApps() {
  const { data, isLoading } = useFinancialConfig();
  const paymentApps = data?.customPaymentApps || [];
  return { paymentApps, isLoading };
}

export function usePaymentAppMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const context = 'Personal';
  const key = queryKeys.financialConfig.one(context);

  return useMutation({
    mutationFn: (customPaymentApps: string[]) =>
      financialConfigApi.patch({ customPaymentApps, context }),
    onMutate: async (customPaymentApps) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<FinancialConfig>(key);
      qc.setQueryData<FinancialConfig>(key, (old) => ({ ...old, context, customPaymentApps }));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      const prev = (ctx as { previous?: FinancialConfig } | undefined)?.previous;
      if (prev) qc.setQueryData(key, prev);
      toast('Failed to save payment apps', 'error');
    },
    onSuccess: () => {
      // Do NOT invalidate — prevents focus-stealing re-render mid-typing.
      toast('Payment apps saved');
    },
  });
}
