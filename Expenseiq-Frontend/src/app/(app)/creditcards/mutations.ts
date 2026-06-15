'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/hooks/queries/keys';
import { useToast } from '@/components/ui/Toast';
import type { CreditCard, NewCreditCard, CreditCardUpdate } from '@/lib/types/api';

export function useCreateCreditCard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: NewCreditCard) => api.createCreditCard(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.creditCards.all }); toast('Credit card added'); },
    onError: () => toast('Failed to add credit card', 'error'),
  });
}

export function useUpdateCreditCard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreditCardUpdate }) => api.updateCreditCard(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.creditCards.all }); toast('Credit card updated'); },
    onError: () => toast('Failed to update credit card', 'error'),
  });
}

export function useDeleteCreditCard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => api.deleteCreditCard(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.creditCards.all }); toast('Credit card deleted'); },
    onError: () => toast('Failed to delete credit card', 'error'),
  });
}

export function useArchiveCreditCard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => api.archiveCreditCard(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.creditCards.all }); toast('Card archived'); },
    onError: () => toast('Failed to archive card', 'error'),
  });
}

export function useRestoreCreditCard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => api.restoreCreditCard(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.creditCards.all }); toast('Card restored'); },
    onError: () => toast('Failed to restore card', 'error'),
  });
}

/**
 * Records a credit card payment as an income transaction on the card's
 * payment method. Invalidates the transactions cache so outstandingBalance
 * recomputes automatically — no new data model required.
 */
export function useRecordPayment() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const context = 'Personal';

  return useMutation({
    mutationFn: ({
      paymentMethod,
      amount,
      date,
      notes,
    }: {
      paymentMethod: string;
      amount: number;
      date: string;
      notes?: string;
    }) =>
      api.createTransaction({
        context,
        type: 'income',
        subtype: 'payment',          // explicitly classifies as a bill payment
        amount,
        date,
        paymentMethod,
        category: 'Credit Card Payment', // visible + filterable in Transactions screen
        notes: notes || '',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all });
      toast('Payment recorded');
    },
    onError: () => toast('Failed to record payment', 'error'),
  });
}

/**
 * Returns a function that updates linkedPaymentMethod (and optionally name)
 * on all CreditCard records that match oldMethodName.
 * Called by the payment method rename cascade in ManagePaymentMethodsModal.
 */
export function useLinkedCardRenameCascade() {
  const qc = useQueryClient();

  return async function cascadeCardRename(
    oldMethodName: string,
    newMethodName: string,
    cards: CreditCard[]
  ): Promise<void> {
    const toUpdate = cards.filter(
      (c) =>
        c.linkedPaymentMethod?.toLowerCase() === oldMethodName.toLowerCase() ||
        // Fallback: also update pre-migration cards whose name matches
        (!c.linkedPaymentMethod && c.name.toLowerCase() === oldMethodName.toLowerCase())
    );

    if (toUpdate.length === 0) return;

    await Promise.all(
      toUpdate.map((c) =>
        api.updateCreditCard(c.id, {
          linkedPaymentMethod: newMethodName,
          // Rename the card display name only when it exactly matched the old method name
          ...(c.name.toLowerCase() === oldMethodName.toLowerCase() ? { name: newMethodName } : {}),
        })
      )
    );

    qc.invalidateQueries({ queryKey: queryKeys.creditCards.all });
  };
}
