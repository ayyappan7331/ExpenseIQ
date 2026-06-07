'use client';

import { Wallet, TrendingDown, PiggyBank, Receipt } from 'lucide-react';
import { StatCard } from '@/components/ui';
import { formatCurrency } from '@/components/charts';
import type { DashboardStats as Stats } from '../helpers';

interface Props {
  stats: Stats;
  prevStats?: Stats;
}

export function DashboardStatsGrid({ stats, prevStats }: Props) {
  const expDelta = prevStats && prevStats.expense > 0
    ? ((stats.expense - prevStats.expense) / prevStats.expense) * 100
    : undefined;
  const incDelta = prevStats && prevStats.income > 0
    ? ((stats.income - prevStats.income) / prevStats.income) * 100
    : undefined;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={<Wallet className="w-5 h-5" />}
        label="Income"
        value={formatCurrency(stats.income)}
        sub={incDelta !== undefined ? `${incDelta >= 0 ? '+' : ''}${incDelta.toFixed(0)}% vs last month` : undefined}
        trend={incDelta !== undefined ? (incDelta >= 0 ? 'up' : 'down') : undefined}
      />
      <StatCard
        icon={<TrendingDown className="w-5 h-5" />}
        label="Expense"
        value={formatCurrency(stats.expense)}
        sub={expDelta !== undefined ? `${expDelta >= 0 ? '+' : ''}${expDelta.toFixed(0)}% vs last month` : undefined}
        trend={expDelta !== undefined ? (expDelta <= 0 ? 'up' : 'down') : undefined}
      />
      <StatCard
        icon={<PiggyBank className="w-5 h-5" />}
        label="Balance"
        value={formatCurrency(stats.balance)}
        sub={stats.savingsRate > 0 ? `${stats.savingsRate.toFixed(0)}% savings rate` : undefined}
        trend={stats.balance >= 0 ? 'up' : 'down'}
      />
      <StatCard
        icon={<Receipt className="w-5 h-5" />}
        label="Activity"
        value={String(stats.txnCount)}
        sub={stats.txnCount > 0 ? `Avg expense: ${formatCurrency(Math.round(stats.avgExpense))}` : undefined}
      />
    </div>
  );
}
