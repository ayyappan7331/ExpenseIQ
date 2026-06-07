'use client';

import { SectionCard, ProgressRow, EmptyState } from '@/components/ui';
import { formatCurrency } from '@/components/charts';
import type { Goal } from '@/lib/types/api';
import type { DashboardStats } from '../helpers';

interface Props {
  goal: Goal | undefined;
  stats: DashboardStats;
}

export function SavingsWidget({ goal, stats }: Props) {
  const saved = Math.max(stats.income - stats.expense, 0);

  if (!goal) {
    return (
      <SectionCard title="Savings Goal">
        <EmptyState emoji="🎯" message="No savings goal set for this month" />
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Savings Goal">
      <div className="space-y-4">
        <ProgressRow
          label="Monthly Target"
          value={saved}
          max={goal.amount}
          formatValue={(v) => formatCurrency(v)}
          formatMax={(m) => formatCurrency(m)}
        />
        <div className="flex items-center justify-between text-xs text-text-3">
          <span>Saved: {formatCurrency(saved)}</span>
          <span>Remaining: {formatCurrency(Math.max(goal.amount - saved, 0))}</span>
        </div>
      </div>
    </SectionCard>
  );
}
