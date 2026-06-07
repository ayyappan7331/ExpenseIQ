'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/hooks/queries/keys';
import { getActiveProfileId } from '@/lib/api/profile';
import { useToast } from '@/components/ui/Toast';
import type { NewTransaction, TransactionUpdate, Transaction } from '@/lib/types/api';

export function useCreateTransaction() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: NewTransaction) => api.createTransaction(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all });
      toast('Transaction added');
    },
    onError: () => toast('Failed to add transaction', 'error'),
  });
}

/**
 * Enhanced create transaction hook with callback support for "Save & Add Another" flow
 */
export function useCreateTransactionWithCallback() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ data, onSuccess }: { data: NewTransaction; onSuccess?: () => void }) => 
      api.createTransaction(data).then(result => ({ result, onSuccess })),
    onSuccess: ({ onSuccess: callback }) => {
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all });
      toast('Transaction added');
      callback?.();
    },
    onError: () => toast('Failed to add transaction', 'error'),
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TransactionUpdate }) =>
      api.updateTransaction(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all });
      toast('Transaction updated');
    },
    onError: () => toast('Failed to update transaction', 'error'),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => api.deleteTransaction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all });
      toast('Transaction deleted');
    },
    onError: () => toast('Failed to delete transaction', 'error'),
  });
}

export function useBulkDeleteTransactions() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (ids: string[]) => api.bulkDeleteTransactions(ids),
    onSuccess: (_, ids) => {
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all });
      toast(`${ids.length} transaction${ids.length > 1 ? 's' : ''} deleted`);
    },
    onError: () => toast('Failed to delete transactions', 'error'),
  });
}

export function useBulkUpdateTransactions() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (updates: Array<{ id: string; category?: string; subcategory?: string; paymentMethod?: string; paymentApp?: string; type?: 'income' | 'expense' }>) => {
      // Use allSettled so a partial network failure doesn't discard
      // the succeeded updates — we report accurate counts in the toast.
      return Promise.allSettled(
        updates.map(({ id, ...data }) => api.updateTransaction(id, data))
      );
    },
    onSuccess: (results, updates) => {
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed    = results.filter(r => r.status === 'rejected').length;
      // Always invalidate — at least some updates went through
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all });
      if (failed === 0) {
        toast(`${succeeded} transaction${succeeded > 1 ? 's' : ''} updated`);
      } else if (succeeded === 0) {
        toast(`Failed to update ${failed} transaction${failed > 1 ? 's' : ''}`, 'error');
      } else {
        toast(
          `${succeeded} updated, ${failed} failed — please retry the failed ones`,
          'error'
        );
      }
      void updates; // updates param used only for count context
    },
    onError: () => toast('Failed to update transactions', 'error'),
  });
}

/**
 * Returns a function that bulk-updates all cached transactions where
 * a given field matches oldValue, replacing it with newValue.
 * Used by rename cascades in Manage modals.
 */
export function useRenameCascade() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return async function cascade(
    field: 'category' | 'subcategory' | 'paymentApp' | 'paymentMethod',
    oldValue: string,
    newValue: string
  ): Promise<void> {
    // Collect all transactions from every cached list key
    const allCached = qc.getQueriesData<Transaction[]>({ queryKey: queryKeys.transactions.all });
    const toUpdate: { id: string; [key: string]: string }[] = [];
    const seen = new Set<string>();

    for (const [, txns] of allCached) {
      if (!Array.isArray(txns)) continue;
      for (const t of txns) {
        if (seen.has(t.id)) continue;
        if (t[field] === oldValue) {
          seen.add(t.id);
          toUpdate.push({ id: t.id, [field]: newValue });
        }
      }
    }

    if (toUpdate.length === 0) return;

    try {
      await Promise.all(toUpdate.map(({ id, ...data }) => api.updateTransaction(id, data)));
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all });
      toast(`${toUpdate.length} transaction${toUpdate.length !== 1 ? 's' : ''} updated`);
    } catch {
      toast('Failed to update some transactions', 'error');
    }
  };
}

/** Returns today's date as YYYY-MM-DD in the browser's local timezone. */
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Default new transaction shape for the form. */
export function defaultNewTransaction(): NewTransaction {
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const now = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return {
    profileId: getActiveProfileId(),
    type: 'expense',
    amount: 0,
    category: '',
    date: today,
    time: now,
    paymentMethod: '',
    paymentApp: '',
    notes: '',
  };
}

/**
 * Create a duplicate transaction from an existing one
 * Clears the ID and resets the date to today
 */
export function duplicateTransaction(transaction: Transaction): NewTransaction {
  return {
    profileId: getActiveProfileId(),
    type: transaction.type,
    subtype: transaction.subtype,   // preserve classification on duplicate
    amount: transaction.amount,
    category: transaction.category || '',
    subcategory: transaction.subcategory || '',
    date: localToday(),
    time: transaction.time || '',
    paymentMethod: transaction.paymentMethod || '',
    paymentApp: transaction.paymentApp || '',
    notes: transaction.notes || '',
  };
}
