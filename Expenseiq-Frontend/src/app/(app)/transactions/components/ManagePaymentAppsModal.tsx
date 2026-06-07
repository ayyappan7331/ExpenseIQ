'use client';

import { ManagedListModal } from './ManagedListModal';
import { usePaymentApps, usePaymentAppMutations } from '@/lib/hooks/usePaymentApps';
import { useRenameCascade } from '../mutations';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ManagePaymentAppsModal({ open, onClose }: Props) {
  const { paymentApps, isLoading } = usePaymentApps();
  const mutation = usePaymentAppMutations();
  const cascade = useRenameCascade();

  return (
    <ManagedListModal
      open={open}
      onClose={onClose}
      title="Manage Payment Apps"
      items={paymentApps}
      defaultItems={new Set()}
      isLoading={isLoading}
      isSaving={mutation.isPending}
      placeholder="New payment app (e.g. GPay)..."
      emptyMessage="No payment apps yet. Add GPay, PhonePe, Paytm, etc."
      deleteWarning={(name) => `Delete "${name}"? Existing transactions using this app will keep their value.`}
      onAdd={(name) => mutation.mutate([...paymentApps, name])}
      onDelete={(name) => mutation.mutate(paymentApps.filter((a) => a !== name))}
      onRename={(oldName, newName) =>
        mutation.mutate(
          paymentApps.map((a) => (a === oldName ? newName : a)),
          { onSuccess: () => cascade('paymentApp', oldName, newName) }
        )
      }
      onReorder={(newOrder) => mutation.mutate(newOrder)}
    />
  );
}
