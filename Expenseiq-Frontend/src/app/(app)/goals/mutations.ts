'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/hooks/queries/keys';
import { useToast } from '@/components/ui/Toast';
import type { NewGoal, Goal } from '@/lib/types/api';

function listKey() {
  return queryKeys.goals.list('Personal');
}

export function useUpsertGoal() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: NewGoal) => api.upsertGoal(data),
    onMutate: async (data) => {
      const key = listKey();
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Goal[]>(key);
      // Optimistically upsert: replace existing month goal or append new one
      qc.setQueryData<Goal[]>(key, (old = []) => {
        const existing = old.find((g) => g.month === data.month);
        if (existing) {
          return old.map((g) => g.month === data.month ? { ...g, amount: data.amount } : g);
        }
        // Temp id for optimistic record — server will assign real id
        return [...old, { ...data, id: `optimistic-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      const prev = (ctx as { previous?: Goal[] } | undefined)?.previous;
      if (prev) qc.setQueryData(listKey(), prev);
      toast('Failed to save goal', 'error');
    },
    onSuccess: () => {
      // Invalidate to get the real server-assigned id (upsert returns the canonical record)
      qc.invalidateQueries({ queryKey: listKey() });
      toast('Goal saved');
    },
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => api.deleteGoal(id),
    onMutate: async (id) => {
      const key = listKey();
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Goal[]>(key);
      qc.setQueryData<Goal[]>(key, (old) => old?.filter((g) => g.id !== id) ?? []);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      const prev = (ctx as { previous?: Goal[] } | undefined)?.previous;
      if (prev) qc.setQueryData(listKey(), prev);
      toast('Failed to delete goal', 'error');
    },
    onSuccess: () => toast('Goal deleted'),
  });
}
