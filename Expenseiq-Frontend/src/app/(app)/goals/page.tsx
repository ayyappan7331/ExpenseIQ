'use client';

import { useMemo, useState } from 'react';
import { Plus, Target, TrendingUp } from 'lucide-react';
import { useGoals, useTransactions } from '@/lib/hooks/queries';
import { getActiveProfileId } from '@/lib/api/profile';
import { last6Months } from '@/lib/utils/dates';
import { Button, StatCard, Modal, ConfirmDialog, EmptyState } from '@/components/ui';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/components/charts';
import type { Goal, NewGoal } from '@/lib/types/api';
import { enrichGoal, type GoalWithProgress } from './helpers';
import { useUpsertGoal, useDeleteGoal } from './mutations';
import { GoalForm, GoalCard } from './components';
import { useMonth } from '@/components/layout/MonthContext';

export default function GoalsPage() {
  const { month: currentMonth } = useMonth();
  const profileId = getActiveProfileId();
  const months = last6Months();

  const { data: goals, isLoading: goalsLoading } = useGoals();
  const { data: currentTxns, isLoading: txnLoading } = useTransactions({ month: currentMonth });

  // Fetch previous months for history
  const m1 = useTransactions({ month: months[1] });
  const m2 = useTransactions({ month: months[2] });
  const m3 = useTransactions({ month: months[3] });
  const m4 = useTransactions({ month: months[4] });
  const m5 = useTransactions({ month: months[5] });

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteGoal, setDeleteGoal] = useState<Goal | undefined>();

  const upsert = useUpsertGoal();
  const del = useDeleteGoal();

  const isLoading = goalsLoading || txnLoading;

  // Current month goal
  const currentGoal = useMemo(() => goals?.find((g) => g.month === currentMonth), [goals, currentMonth]);
  const currentProgress: GoalWithProgress | undefined = useMemo(
    () => currentGoal ? enrichGoal(currentGoal, currentTxns || []) : undefined,
    [currentGoal, currentTxns]
  );

  // Previous months goals with progress
  const prevGoals = useMemo(() => {
    if (!goals) return [];
    const txnByMonth: Record<string, typeof currentTxns> = {
      [months[1]]: m1.data || [],
      [months[2]]: m2.data || [],
      [months[3]]: m3.data || [],
      [months[4]]: m4.data || [],
      [months[5]]: m5.data || [],
    };
    return goals
      .filter((g) => g.month !== currentMonth)
      .map((g) => enrichGoal(g, (txnByMonth[g.month] as typeof currentTxns) || []))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [goals, currentMonth, m1.data, m2.data, m3.data, m4.data, m5.data, months]);

  function handleSubmit(data: NewGoal) {
    upsert.mutate(data, { onSuccess: () => setModalOpen(false) });
  }

  function handleDelete() {
    if (!deleteGoal) return;
    del.mutate(deleteGoal.id, { onSuccess: () => setDeleteGoal(undefined) });
  }

  if (isLoading) {
    return <div className="space-y-4"><SkeletonCard /><SkeletonCard className="h-[200px]" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-semibold text-text">Savings Goals</h2>
        <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
          {currentGoal ? 'Update Goal' : 'Set Goal'}
        </Button>
      </div>

      {/* Current month hero */}
      {currentProgress ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            icon={<Target className="w-5 h-5" />}
            label="This Month's Target"
            value={formatCurrency(currentProgress.amount)}
            sub={`${currentProgress.pct.toFixed(0)}% achieved`}
            trend={currentProgress.isAchieved ? 'up' : 'flat'}
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Saved So Far"
            value={formatCurrency(currentProgress.saved)}
            sub={currentProgress.isAchieved ? 'Goal achieved! 🎉' : `${formatCurrency(currentProgress.amount - currentProgress.saved)} to go`}
            trend={currentProgress.isAchieved ? 'up' : 'flat'}
          />
        </div>
      ) : (
        <EmptyState
          emoji="🎯"
          message="No savings goal set for this month"
          action={<Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setModalOpen(true)}>Set Goal</Button>}
        />
      )}

      {/* Current month card */}
      {currentProgress && (
        <GoalCard goal={currentProgress} onDelete={() => setDeleteGoal(currentGoal)} isCurrent />
      )}

      {/* Previous months */}
      {prevGoals.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text-2">Previous Months</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {prevGoals.map((g) => (
              <GoalCard key={g.id} goal={g} onDelete={() => setDeleteGoal(g)} />
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={currentGoal ? 'Update Goal' : 'Set Goal'} size="sm">
        <GoalForm month={currentMonth} profileId={profileId} initialAmount={currentGoal?.amount} onSubmit={handleSubmit} onCancel={() => setModalOpen(false)} loading={upsert.isPending} />
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog open={!!deleteGoal} onClose={() => setDeleteGoal(undefined)} onConfirm={handleDelete} message="Delete this savings goal?" loading={del.isPending} />
    </div>
  );
}
