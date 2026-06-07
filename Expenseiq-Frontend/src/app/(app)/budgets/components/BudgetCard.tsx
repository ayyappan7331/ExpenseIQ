'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { Button, ProgressRow } from '@/components/ui';
import { formatCurrency } from '@/components/charts';
import type { BudgetWithSpent } from '../helpers';

interface Props {
  budget: BudgetWithSpent;
  onEdit: () => void;
  onDelete: () => void;
}

export function BudgetCard({ budget, onEdit, onDelete }: Props) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text">{budget.category}</span>
        <div className="flex items-center gap-1">
          <Button variant="icon" size="sm" onClick={onEdit} aria-label="Edit budget">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="icon" size="sm" onClick={onDelete} aria-label="Delete budget">
            <Trash2 className="w-3.5 h-3.5 text-expense" />
          </Button>
        </div>
      </div>
      <ProgressRow
        label=""
        value={budget.spent}
        max={budget.amount}
        formatValue={(v) => formatCurrency(v)}
        formatMax={(m) => formatCurrency(m)}
      />
      <p className={`text-[11px] ${budget.isOver ? 'text-expense' : 'text-text-3'}`}>
        {budget.isOver
          ? `Over by ${formatCurrency(budget.spent - budget.amount)}`
          : `${formatCurrency(budget.remaining)} remaining`}
      </p>
    </div>
  );
}
