'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/hooks/queries/keys';
import { useToast } from '@/components/ui/Toast';
import type { NewDebt, DebtUpdate, Debt } from '@/lib/types/api';

function listKey() {
  return queryKeys.debts.list('Personal');
}

export function useCreateDebt() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: NewDebt) => api.createDebt(data),
    // Create needs server response for the real id — invalidate after success
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.debts.all });
      toast('Debt added');
    },
    onError: () => toast('Failed to add debt', 'error'),
  });
}

export function useUpdateDebt() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DebtUpdate }) =>
      api.updateDebt(id, data),
    // Optimistic update — no refetch, so no focus disruption
    onMutate: async ({ id, data }) => {
      const key = listKey();
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Debt[]>(key);
      qc.setQueryData<Debt[]>(key, (old) =>
        old?.map((d) => (d.id === id ? { ...d, ...data } : d)) ?? []
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      const prev = (ctx as { previous?: Debt[] } | undefined)?.previous;
      if (prev) qc.setQueryData(listKey(), prev);
      toast('Failed to update debt', 'error');
    },
    onSuccess: () => toast('Debt updated'),
  });
}

export function useDeleteDebt() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => api.deleteDebt(id),
    onMutate: async (id) => {
      const key = listKey();
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Debt[]>(key);
      qc.setQueryData<Debt[]>(key, (old) =>
        old?.filter((d) => d.id !== id) ?? []
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      const prev = (ctx as { previous?: Debt[] } | undefined)?.previous;
      if (prev) qc.setQueryData(listKey(), prev);
      toast('Failed to delete debt', 'error');
    },
    onSuccess: () => toast('Debt deleted'),
  });
}
