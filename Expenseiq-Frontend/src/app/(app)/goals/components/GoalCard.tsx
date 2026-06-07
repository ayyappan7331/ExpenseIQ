'use client';

import { Trash2 } from 'lucide-react';
import { Button, ProgressRow, Badge } from '@/components/ui';
import { formatCurrency } from '@/components/charts';
import { monthLabel } from '@/lib/utils/dates';
import type { GoalWithProgress } from '../helpers';

interface Props {
  goal: GoalWithProgress;
  onDelete: () => void;
  isCurrent?: boolean;
}

export function GoalCard({ goal, onDelete, isCurrent }: Props) {
  return (
    <div className={`bg-card border border-card-border rounded-xl p-4 space-y-3 ${isCurrent ? 'ring-1 ring-accent/30' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text">{monthLabel(goal.month)}</span>
          {isCurrent && <Badge variant="accent">Current</Badge>}
          {goal.isAchieved && <Badge variant="income">Achieved</Badge>}
        </div>
        <Button variant="icon" size="sm" onClick={onDelete} aria-label="Delete goal">
          <Trash2 className="w-3.5 h-3.5 text-expense" />
        </Button>
      </div>
      <ProgressRow
        label=""
        value={goal.saved}
        max={goal.amount}
        formatValue={(v) => formatCurrency(v)}
        formatMax={(m) => formatCurrency(m)}
        color={goal.isAchieved ? 'var(--income)' : undefined}
      />
      <p className="text-[11px] text-text-3">
        {goal.isAchieved
          ? `Exceeded by ${formatCurrency(goal.saved - goal.amount)}`
          : `${formatCurrency(goal.amount - goal.saved)} remaining`}
      </p>
    </div>
  );
}
