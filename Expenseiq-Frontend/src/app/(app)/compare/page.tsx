'use client';

import { useMemo, useState } from 'react';
import { useTransactions } from '@/lib/hooks/queries';
import { last6Months, monthLabel } from '@/lib/utils/dates';
import { StatCard, SectionCard, Badge, EmptyState } from '@/components/ui';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { BarChart, formatCurrency } from '@/components/charts';
import { TrendingUp, TrendingDown, ArrowRightLeft } from 'lucide-react';
import { computeStats } from '@/app/(app)/dashboard/helpers';
import { computeComparison, pctChange } from '@/app/(app)/analytics/helpers';

export default function ComparePage() {
  const months = last6Months();
  const [monthA, setMonthA] = useState(months[1]); // last month
  const [monthB, setMonthB] = useState(months[0]); // current month

  const { data: txnsA, isLoading: loadA } = useTransactions({ month: monthA });
  const { data: txnsB, isLoading: loadB } = useTransactions({ month: monthB });

  const statsA = useMemo(() => computeStats(txnsA || []), [txnsA]);
  const statsB = useMemo(() => computeStats(txnsB || []), [txnsB]);
  const comparison = useMemo(() => computeComparison(txnsA || [], txnsB || []), [txnsA, txnsB]);

  const isLoading = loadA || loadB;

  const expChange = pctChange(statsB.expense, statsA.expense);
  const incChange = pctChange(statsB.income, statsA.income);

  if (isLoading) {
    return <div className="space-y-4"><SkeletonCard /><SkeletonCard className="h-[300px]" /></div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-text">Compare Months</h2>

      {/* Month selectors */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={monthA}
          onChange={(e) => setMonthA(e.target.value)}
          className="px-3 py-2 text-sm bg-bg-2 border border-card-border rounded-xl text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
          aria-label="First month"
        >
          {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
        <ArrowRightLeft className="w-4 h-4 text-text-3" />
        <select
          value={monthB}
          onChange={(e) => setMonthB(e.target.value)}
          className="px-3 py-2 text-sm bg-bg-2 border border-card-border rounded-xl text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
          aria-label="Second month"
        >
          {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Income Change" value={`${incChange >= 0 ? '+' : ''}${incChange.toFixed(0)}%`} sub={`${formatCurrency(statsA.income)} → ${formatCurrency(statsB.income)}`} trend={incChange >= 0 ? 'up' : 'down'} />
        <StatCard icon={<TrendingDown className="w-5 h-5" />} label="Expense Change" value={`${expChange >= 0 ? '+' : ''}${expChange.toFixed(0)}%`} sub={`${formatCurrency(statsA.expense)} → ${formatCurrency(statsB.expense)}`} trend={expChange <= 0 ? 'up' : 'down'} />
        <StatCard icon={<ArrowRightLeft className="w-5 h-5" />} label="Balance Change" value={formatCurrency(statsB.balance - statsA.balance)} sub={`${formatCurrency(statsA.balance)} → ${formatCurrency(statsB.balance)}`} trend={statsB.balance >= statsA.balance ? 'up' : 'down'} />
      </div>

      {/* Bar chart comparison */}
      <SectionCard title="Income vs Expense">
        <BarChart
          labels={[monthLabel(monthA), monthLabel(monthB)]}
          datasets={[
            { label: 'Income', data: [statsA.income, statsB.income], color: 'var(--income)' },
            { label: 'Expense', data: [statsA.expense, statsB.expense], color: 'var(--expense)' },
          ]}
          height="260px"
          aria-label="Month comparison bar chart"
        />
      </SectionCard>

      {/* Category diff table */}
      <SectionCard title="Category Comparison" padding={false}>
        {comparison.length === 0 ? (
          <EmptyState emoji="📊" message="No expense data to compare" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-text-3 uppercase">Category</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-text-3 uppercase">{monthLabel(monthA)}</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-text-3 uppercase">{monthLabel(monthB)}</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-text-3 uppercase">Change</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row.category} className="border-b border-card-border/50">
                    <td className="px-4 py-2.5 text-text">{row.category}</td>
                    <td className="px-4 py-2.5 text-right text-text-2">{formatCurrency(row.monthA)}</td>
                    <td className="px-4 py-2.5 text-right text-text-2">{formatCurrency(row.monthB)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Badge variant={row.change <= 0 ? 'income' : 'expense'}>
                        {row.change > 0 ? '+' : ''}{formatCurrency(row.change)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
