'use client';

import { ManagedListModal } from './ManagedListModal';
import { usePaymentMethods, usePaymentMethodMutations } from '@/lib/hooks/usePaymentMethods';
import { useCreditCards } from '@/lib/hooks/queries';
import { useLinkedCardRenameCascade } from '@/app/(app)/creditcards/mutations';
import { useRenameCascade } from '@/app/(app)/transactions/mutations';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ManagePaymentMethodsModal({ open, onClose }: Props) {
  const { paymentMethods, isLoading } = usePaymentMethods();
  const mutation = usePaymentMethodMutations();
  const { data: cards } = useCreditCards();
  const cascadeCardRename = useLinkedCardRenameCascade();
  const cascadeTxnRename  = useRenameCascade();

  function handleAdd(name: string) {
    mutation.mutate([...paymentMethods, name]);
  }

  function handleDelete(name: string) {
    mutation.mutate(paymentMethods.filter((m) => m !== name));
  }

  function handleRename(oldName: string, newName: string) {
    // 1. Update FinancialConfig payment methods list
    mutation.mutate(
      paymentMethods.map((m) => (m === oldName ? newName : m)),
      {
        onSuccess: () => {
          // 2. Update CreditCard.linkedPaymentMethod for any linked cards
          cascadeCardRename(oldName, newName, cards ?? []);
          // 3. Update paymentMethod field on all existing transactions
          //    so outstanding balance calculations on CC screen stay correct
          cascadeTxnRename('paymentMethod', oldName, newName);
        },
      }
    );
  }

  function handleReorder(newOrder: string[]) {
    mutation.mutate(newOrder);
  }

  return (
    <ManagedListModal
      open={open}
      onClose={onClose}
      title="Manage Payment Methods"
      items={paymentMethods}
      defaultItems={new Set()}
      isLoading={isLoading}
      isSaving={mutation.isPending}
      placeholder="New payment method..."
      emptyMessage="No payment methods yet. Add your first one!"
      deleteWarning={(name) => `Delete "${name}"? Existing transactions using this method will keep their value.`}
      onAdd={handleAdd}
      onDelete={handleDelete}
      onRename={handleRename}
      onReorder={handleReorder}
    />
  );
}
