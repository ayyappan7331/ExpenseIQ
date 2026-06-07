'use client';

import { Modal } from '@/components/ui';
import { TransactionForm } from './TransactionForm';
import { useCreateTransaction, useUpdateTransaction, defaultNewTransaction } from '../mutations';
import { getActiveProfileId } from '@/lib/api/profile';
import type { Transaction, NewTransaction } from '@/lib/types/api';

interface Props {
  open: boolean;
  onClose: () => void;
  editTransaction?: Transaction;
}

export function TransactionModal({ open, onClose, editTransaction }: Props) {
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const isEdit = !!editTransaction;

  function handleSubmit(data: NewTransaction) {
    const payload = { ...data, profileId: data.profileId || getActiveProfileId() };
    if (isEdit) {
      update.mutate({ id: editTransaction.id, data: payload }, { onSuccess: onClose });
    } else {
      create.mutate(payload, { onSuccess: onClose });
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Transaction' : 'Add Transaction'}
    >
      <TransactionForm
        initial={editTransaction || ({ ...defaultNewTransaction(), profileId: getActiveProfileId() } as unknown as Transaction)}
        onSubmit={handleSubmit}
        onCancel={onClose}
        loading={create.isPending || update.isPending}
      />
    </Modal>
  );
}
