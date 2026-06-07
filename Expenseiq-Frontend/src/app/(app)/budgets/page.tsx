'use client';

import { useMemo, useState } from 'react';
import { Plus, PiggyBank, AlertTriangle, BarChart3 } from 'lucide-react';
import { useTransactions, useBudgets } from '@/lib/hooks/queries';
import { getActiveProfileId } from '@/lib/api/profile';
import { Button, StatCard, Modal, ConfirmDialog, EmptyState, PageError } from '@/components/ui';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/components/charts';
import { getApiErrorMessage } from '@/lib/utils/apiErrors';
import type { Budget, NewBudget } from '@/lib/types/api';
import { enrichBudgets, budgetSummary } from './helpers';
import { useUpsertBudget, useDeleteBudget } from './mutations';
import { BudgetForm, BudgetCard } from './components';
import { useMonth } from '@/components/layout/MonthContext';

export default function BudgetsPage() {
  const { month } = useMonth();
  const profileId = getActiveProfileId();
  const { data: budgets, isLoading: budgetLoading, isError: budgetError, error: budgetErrorObj, refetch } = useBudgets({ month });
  const { data: txns, isLoading: txnLoading } = useTransactions({ month });

  const [modalOpen, setModalOpen] = useState(false);
  const [editBudget, setEditBudget] = useState<Budget | undefined>();
  const [deleteBudget, setDeleteBudget] = useState<Budget | undefined>();

  const upsert = useUpsertBudget();
  const del = useDeleteBudget();

  const enriched = useMemo(() => enrichBudgets(budgets || [], txns || []), [budgets, txns]);
  const summary = useMemo(() => budgetSummary(enriched), [enriched]);

  const isLoading = budgetLoading || txnLoading;

  const openAdd = () => { setEditBudget(undefined); setModalOpen(true); };
  const openEdit = (b: Budget) => { setEditBudget(b); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditBudget(undefined); };

  function handleSubmit(data: NewBudget) {
    upsert.mutate(data, { onSuccess: closeModal });
  }

  function handleDelete() {
    if (!deleteBudget) return;
    del.mutate(deleteBudget.id, { onSuccess: () => setDeleteBudget(undefined) });
  }

  if (isLoading) {
    return <div className="space-y-4"><SkeletonCard /><SkeletonCard className="h-[300px]" /></div>;
  }

  if (budgetError) {
    return <PageError message={getApiErrorMessage(budgetErrorObj, 'Failed to load budgets')} onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-semibold text-text">Budgets</h2>
        <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={openAdd}>Set Budget</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<PiggyBank className="w-5 h-5" />} label="Total Budget" value={formatCurrency(summary.totalBudget)} sub={`${summary.count} categories`} />
        <StatCard icon={<BarChart3 className="w-5 h-5" />} label="Total Spent" value={formatCurrency(summary.totalSpent)} sub={summary.totalBudget > 0 ? `${((summary.totalSpent / summary.totalBudget) * 100).toFixed(0)}% used` : undefined} trend={summary.totalSpent <= summary.totalBudget ? 'up' : 'down'} />
        <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Over Budget" value={String(summary.overCount)} sub={summary.overCount > 0 ? 'categories exceeded' : 'All on track'} trend={summary.overCount === 0 ? 'up' : 'down'} />
      </div>

      {/* Budget grid */}
      {enriched.length === 0 ? (
        <EmptyState emoji="📊" message="No budgets set for this month" action={<Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={openAdd}>Set Budget</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {enriched.map((b) => (
            <BudgetCard key={b.id} budget={b} onEdit={() => openEdit(b)} onDelete={() => setDeleteBudget(b)} />
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={closeModal} title={editBudget ? 'Edit Budget' : 'Set Budget'} size="sm">
        <BudgetForm initial={editBudget} month={month} profileId={profileId} onSubmit={handleSubmit} onCancel={closeModal} loading={upsert.isPending} />
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog open={!!deleteBudget} onClose={() => setDeleteBudget(undefined)} onConfirm={handleDelete} message={`Delete the ${deleteBudget?.category || ''} budget?`} loading={del.isPending} />
    </div>
  );
}
