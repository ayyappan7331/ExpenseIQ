'use client';

import { useMemo, useState } from 'react';
import { Plus, HandCoins, Handshake } from 'lucide-react';
import { useDebts } from '@/lib/hooks/queries';
import { getActiveProfileId } from '@/lib/api/profile';
import { Button, StatCard, SectionCard, Tabs, Modal, Input, Select, ConfirmDialog, EmptyState, Badge } from '@/components/ui';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/components/charts';
import { dateLabel } from '@/lib/utils/dates';
import type { Debt, NewDebt } from '@/lib/types/api';
import { useCreateDebt, useUpdateDebt, useDeleteDebt } from './mutations';

const TYPES = [
  { value: 'lent', label: 'Lent' },
  { value: 'borrowed', label: 'Borrowed' },
];

// ── Self-contained form — state lives HERE, not in the page ──────────────
interface DebtFormProps {
  profileId: string;
  initialType?: 'lent' | 'borrowed';
  onSuccess: () => void;
  onCancel: () => void;
}

function DebtForm({ profileId, initialType = 'lent', onSuccess, onCancel }: DebtFormProps) {
  const create = useCreateDebt();

  const [type, setType]     = useState<'lent' | 'borrowed'>(initialType);
  const [person, setPerson] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote]     = useState('');
  const [date, setDate]     = useState(() => new Date().toISOString().slice(0, 10));

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const payload: NewDebt = {
      profileId,
      type,
      person: person.trim(),
      amount: Number(amount),
      note: note.trim() || undefined,
      date,
      settled: false,
    };
    create.mutate(payload, { onSuccess });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Type"
        value={type}
        onChange={(e) => setType(e.target.value as 'lent' | 'borrowed')}
        options={TYPES}
      />
      <Input
        label="Person"
        value={person}
        onChange={(e) => setPerson(e.target.value)}
        placeholder="Name"
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
        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>
      <Input
        label="Note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional"
      />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={create.isPending}>Add</Button>
      </div>
    </form>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────
export default function DebtsPage() {
  const profileId = getActiveProfileId();
  const { data: debts, isLoading } = useDebts();

  const [tab, setTab]           = useState('lent');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDebt, setDeleteDebt] = useState<Debt | undefined>();

  const update = useUpdateDebt();
  const del    = useDeleteDebt();

  const lent     = useMemo(() => debts?.filter((d) => d.type === 'lent' && !d.settled) ?? [], [debts]);
  const borrowed = useMemo(() => debts?.filter((d) => d.type === 'borrowed' && !d.settled) ?? [], [debts]);
  const settled  = useMemo(() => debts?.filter((d) => d.settled) ?? [], [debts]);

  const lentTotal     = lent.reduce((s, d) => s + d.amount, 0);
  const borrowedTotal = borrowed.reduce((s, d) => s + d.amount, 0);

  function openAdd() { setModalOpen(true); }
  function closeModal() { setModalOpen(false); }

  function toggleSettle(d: Debt) {
    const today = new Date().toISOString().slice(0, 10);
    update.mutate({ id: d.id, data: { settled: !d.settled, settledDate: d.settled ? null : today } });
  }

  const activeList = tab === 'lent' ? lent : tab === 'borrowed' ? borrowed : settled;

  if (isLoading) return <div className="space-y-4"><SkeletonCard /><SkeletonCard className="h-[300px]" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-semibold text-text">Debts</h2>
        <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={openAdd}>Add</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard icon={<HandCoins className="w-5 h-5" />} label="You Lent" value={formatCurrency(lentTotal)} sub={`${lent.length} active`} trend="down" />
        <StatCard icon={<Handshake className="w-5 h-5" />} label="You Borrowed" value={formatCurrency(borrowedTotal)} sub={`${borrowed.length} active`} trend="down" />
      </div>

      <Tabs
        tabs={[
          { id: 'lent',     label: `Lent (${lent.length})` },
          { id: 'borrowed', label: `Borrowed (${borrowed.length})` },
          { id: 'settled',  label: `Settled (${settled.length})` },
        ]}
        active={tab}
        onChange={setTab}
      />

      {activeList.length === 0 ? (
        <EmptyState
          emoji="🤝"
          message={`No ${tab} debts`}
          action={tab !== 'settled'
            ? <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={openAdd}>Add Debt</Button>
            : undefined}
        />
      ) : (
        <SectionCard title={tab.charAt(0).toUpperCase() + tab.slice(1)} padding={false}>
          <div className="divide-y divide-card-border/50">
            {activeList.map((d) => (
              <div key={d.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text truncate">{d.person}</p>
                  <p className="text-[11px] text-text-3">
                    {dateLabel(d.date)}{d.note ? ` · ${d.note}` : ''}
                  </p>
                </div>
                <Badge variant={d.type === 'lent' ? 'expense' : 'income'}>
                  {formatCurrency(d.amount)}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => toggleSettle(d)}>
                  {d.settled ? 'Undo' : 'Settle'}
                </Button>
                <Button variant="icon" size="sm" onClick={() => setDeleteDebt(d)} aria-label="Delete">
                  <span className="text-expense text-xs">✕</span>
                </Button>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Modal — DebtForm owns all form state, completely isolated from page re-renders */}
      <Modal open={modalOpen} onClose={closeModal} title="Add Debt" size="sm">
        <DebtForm
          key={modalOpen ? 'open' : 'closed'}
          profileId={profileId}
          initialType={tab === 'borrowed' ? 'borrowed' : 'lent'}
          onSuccess={closeModal}
          onCancel={closeModal}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleteDebt}
        onClose={() => setDeleteDebt(undefined)}
        onConfirm={() => { if (deleteDebt) del.mutate(deleteDebt.id, { onSuccess: () => setDeleteDebt(undefined) }); }}
        message={`Delete debt with ${deleteDebt?.person}?`}
        loading={del.isPending}
      />
    </div>
  );
}
