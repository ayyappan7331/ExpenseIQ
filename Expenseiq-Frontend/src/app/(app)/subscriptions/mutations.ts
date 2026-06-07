'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/hooks/queries/keys';
import { getActiveProfileId } from '@/lib/api/profile';
import { useToast } from '@/components/ui/Toast';
import type { NewSubscription, SubscriptionUpdate, Subscription } from '@/lib/types/api';

function listKey() {
  return queryKeys.subscriptions.list(getActiveProfileId());
}

export function useCreateSubscription() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: NewSubscription) => api.createSubscription(data),
    // Create needs server response for the real id — invalidate after success
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.subscriptions.all });
      toast('Subscription added');
    },
    onError: () => toast('Failed to add subscription', 'error'),
  });
}

export function useUpdateSubscription() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SubscriptionUpdate }) =>
      api.updateSubscription(id, data),
    // Optimistic update — no refetch, so no focus disruption
    onMutate: async ({ id, data }) => {
      const key = listKey();
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Subscription[]>(key);
      qc.setQueryData<Subscription[]>(key, (old) =>
        old?.map((s) => (s.id === id ? { ...s, ...data } : s)) ?? []
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      const prev = (ctx as { previous?: Subscription[] } | undefined)?.previous;
      if (prev) qc.setQueryData(listKey(), prev);
      toast('Failed to update subscription', 'error');
    },
    onSuccess: () => toast('Subscription updated'),
  });
}

export function useDeleteSubscription() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => api.deleteSubscription(id),
    onMutate: async (id) => {
      const key = listKey();
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Subscription[]>(key);
      qc.setQueryData<Subscription[]>(key, (old) =>
        old?.filter((s) => s.id !== id) ?? []
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      const prev = (ctx as { previous?: Subscription[] } | undefined)?.previous;
      if (prev) qc.setQueryData(listKey(), prev);
      toast('Failed to delete subscription', 'error');
    },
    onSuccess: () => toast('Subscription deleted'),
  });
}
