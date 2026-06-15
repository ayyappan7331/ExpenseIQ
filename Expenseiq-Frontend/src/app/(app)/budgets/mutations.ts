'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/hooks/queries/keys';
import { useToast } from '@/components/ui/Toast';
import type { NewBudget, Budget } from '@/lib/types/api';

function listKey(month?: string) {
  return queryKeys.budgets.list('Personal', month);
}

export function useUpsertBudget() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: NewBudget) => api.upsertBudget(data),
    onMutate: async (data) => {
      const key = listKey(data.month);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Budget[]>(key);
      qc.setQueryData<Budget[]>(key, (old = []) => {
        const existing = old.find((b) => b.category === data.category && b.month === data.month);
        if (existing) {
          return old.map((b) =>
            b.category === data.category && b.month === data.month
              ? { ...b, amount: data.amount }
              : b
          );
        }
        return [...old, { ...data, id: `optimistic-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
      });
      return { previous, month: data.month };
    },
    onError: (_err, vars, ctx) => {
      const { previous, month } = (ctx as { previous?: Budget[]; month?: string } | undefined) ?? {};
      if (previous) qc.setQueryData(listKey(month ?? vars.month), previous);
      toast('Failed to save budget', 'error');
    },
    onSuccess: (_data, vars) => {
      // Invalidate to get real server id
      qc.invalidateQueries({ queryKey: listKey(vars.month) });
      toast('Budget saved');
    },
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => api.deleteBudget(id),
    onMutate: async (id) => {
      // Delete across all budget list keys since we don't know the month
      const allKeys = qc.getQueriesData<Budget[]>({ queryKey: queryKeys.budgets.all });
      const snapshots: Array<[unknown, Budget[] | undefined]> = [];
      for (const [key, data] of allKeys) {
        if (!Array.isArray(data)) continue;
        snapshots.push([key, data]);
        await qc.cancelQueries({ queryKey: key as string[] });
        qc.setQueryData<Budget[]>(key as string[], data.filter((b) => b.id !== id));
      }
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      const { snapshots } = (ctx as { snapshots?: Array<[unknown, Budget[] | undefined]> } | undefined) ?? {};
      if (snapshots) {
        for (const [key, data] of snapshots) {
          if (data) qc.setQueryData(key as string[], data);
        }
      }
      toast('Failed to delete budget', 'error');
    },
    onSuccess: () => toast('Budget deleted'),
  });
}
