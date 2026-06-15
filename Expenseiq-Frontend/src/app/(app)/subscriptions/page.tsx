'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useMemo, useState, useEffect } from 'react';
import { Plus, Repeat, DollarSign, Pause } from 'lucide-react';
import { useSubscriptions } from '@/lib/hooks/queries';
import { Button, StatCard, SectionCard, Modal, Input, Select, ConfirmDialog, EmptyState, Badge } from '@/components/ui';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/components/charts';
import type { Subscription, NewSubscription } from '@/lib/types/api';
import { useCreateSubscription, useUpdateSubscription, useDeleteSubscription } from './mutations';

const CYCLES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

// ── Self-contained form — state lives HERE, not in the page ──────────────
// This matches the ManagedListModal pattern: form state is isolated from
// the parent's React Query data so no refetch can steal focus mid-typing.
interface SubscriptionFormProps {
  editSub?: Subscription;
  context: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function SubscriptionForm({ editSub, context, onSuccess, onCancel }: SubscriptionFormProps) {
  const create = useCreateSubscription();
  const update = useUpdateSubscription();

  const [name, setName]       = useState(editSub?.name ?? '');
  const [amount, setAmount]   = useState(editSub ? String(editSub.amount) : '');
  const [cycle, setCycle]     = useState<'monthly' | 'quarterly' | 'yearly'>(editSub?.cycle ?? 'monthly');
  const [due, setDue]         = useState(editSub?.due ?? '');
  const [category, setCategory] = useState(editSub?.category ?? '');

  // Sync when editSub changes (modal opened for a different subscription)
  useEffect(() => {
    setName(editSub?.name ?? '');
    setAmount(editSub ? String(editSub.amount) : '');
    setCycle((editSub?.cycle ?? 'monthly') as 'monthly' | 'quarterly' | 'yearly');
    setDue(editSub?.due ?? '');
    setCategory(editSub?.category ?? '');
  }, [editSub]);

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const payload: NewSubscription = {
      context,
      name: name.trim(),
      amount: Number(amount),
      cycle: cycle as 'monthly' | 'quarterly' | 'yearly',
      due,
      category: category.trim() || undefined,
      active: true,
    };
    if (editSub) {
      update.mutate({ id: editSub.id, data: payload }, { onSuccess });
    } else {
      create.mutate(payload, { onSuccess });
    }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Netflix, Gym..."
        required
        autoFocus
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="₹0"
          min="0"
          required
        />
        <Select
          label="Cycle"
          value={cycle}
          onChange={(e) => setCycle(e.target.value as 'monthly' | 'quarterly' | 'yearly')}
          options={CYCLES}
        />
      </div>
      <Input
        label="Due Date"
        type="date"
        value={due}
        onChange={(e) => setDue(e.target.value)}
        required
      />
      <Input
        label="Category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="Optional"
      />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={isPending}>{editSub ? 'Update' : 'Add'}</Button>
      </div>
    </form>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────
export default function SubscriptionsPage() {
  const context = 'Personal';
  const { data: subs, isLoading } = useSubscriptions();

  // Modal state only — NO form state here
  const [modalOpen, setModalOpen] = useState(false);
  const [editSub, setEditSub] = useState<Subscription | undefined>();
  const [deleteSub, setDeleteSub] = useState<Subscription | undefined>();

  const update = useUpdateSubscription();
  const del = useDeleteSubscription();

  const monthlyCost = useMemo(() => {
    if (!subs) return 0;
    return subs.filter((s) => s.active !== false).reduce((sum, s) => {
      if (s.cycle === 'yearly') return sum + s.amount / 12;
      if (s.cycle === 'quarterly') return sum + s.amount / 3;
      return sum + s.amount;
    }, 0);
  }, [subs]);

  const activeCount = useMemo(() => subs?.filter((s) => s.active !== false).length ?? 0, [subs]);
  const pausedCount = useMemo(() => subs?.filter((s) => s.active === false).length ?? 0, [subs]);

  function openAdd()            { setEditSub(undefined); setModalOpen(true); }
  function openEdit(s: Subscription) { setEditSub(s); setModalOpen(true); }
  function closeModal()         { setModalOpen(false); setEditSub(undefined); }

  function toggleActive(s: Subscription) {
    update.mutate({ id: s.id, data: { active: !s.active } });
  }

  if (isLoading) return <div className="space-y-4"><SkeletonCard /><SkeletonCard className="h-[300px]" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-semibold text-text">Subscriptions</h2>
        <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={openAdd}>Add</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<DollarSign className="w-5 h-5" />} label="Monthly Cost" value={formatCurrency(Math.round(monthlyCost))} sub={`${activeCount} active`} />
        <StatCard icon={<Repeat className="w-5 h-5" />} label="Active" value={String(activeCount)} />
        <StatCard icon={<Pause className="w-5 h-5" />} label="Paused" value={String(pausedCount)} />
      </div>

      {!subs || subs.length === 0 ? (
        <EmptyState
          emoji="🔄"
          message="No subscriptions yet"
          action={<Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={openAdd}>Add Subscription</Button>}
        />
      ) : (
        <SectionCard title="All Subscriptions" padding={false}>
          <div className="divide-y divide-card-border/50">
            {subs.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text truncate">{s.name}</p>
                  <p className="text-[11px] text-text-3">{s.cycle} · Due: {s.due}</p>
                </div>
                <Badge variant={s.active !== false ? 'income' : 'default'}>
                  {s.active !== false ? 'Active' : 'Paused'}
                </Badge>
                <span className="text-sm font-medium text-text">{formatCurrency(s.amount)}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(s)}>
                    {s.active !== false ? 'Pause' : 'Resume'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>Edit</Button>
                  <Button variant="icon" size="sm" onClick={() => setDeleteSub(s)} aria-label="Delete">
                    <span className="text-expense text-xs">✕</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Modal — form state is fully inside SubscriptionForm, isolated from this page */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editSub ? 'Edit Subscription' : 'Add Subscription'}
        size="sm"
      >
        <SubscriptionForm
          key={editSub?.id ?? 'new'}
          editSub={editSub}
          context={context}
          onSuccess={closeModal}
          onCancel={closeModal}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleteSub}
        onClose={() => setDeleteSub(undefined)}
        onConfirm={() => { if (deleteSub) del.mutate(deleteSub.id, { onSuccess: () => setDeleteSub(undefined) }); }}
        message={`Delete "${deleteSub?.name}" subscription?`}
        loading={del.isPending}
      />
    </div>
  );
}
