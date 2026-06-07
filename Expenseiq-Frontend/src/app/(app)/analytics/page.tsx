'use client';

import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, PiggyBank, CreditCard, ChevronRight } from 'lucide-react';
import { useTransactions } from '@/lib/hooks/queries';
import { prevMonth, last6Months, monthLabel } from '@/lib/utils/dates';
import { StatCard, SectionCard, EmptyState } from '@/components/ui';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useMonth } from '@/components/layout/MonthContext';
import {
  TrendLineChart,
  CategoryDoughnut,
  BarChart,
  ChartLegend,
  categoryColor,
  formatCurrency,
} from '@/components/charts';
import { computeStats, computeCategoryBreakdown } from '@/app/(app)/dashboard/helpers';
import { computePaymentBreakdown, computeSavingsTrend, pctChange } from './helpers';

export default function AnalyticsPage() {
  const { month: currentMonth } = useMonth();
  // When currentMonth is '' (All Months), prevMonth would return 'NaN-NaN'.
  // Guard it so we only fetch previous month when a specific month is selected.
  const prevMo = currentMonth ? prevMonth(currentMonth) : undefined;
  const months = last6Months().reverse();

  // Selected category for subcategory deep-dive (null = none selected)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: txns, isLoading } = useTransactions({ month: currentMonth || undefined });
  const { data: prevTxns } = useTransactions({ month: prevMo });

  // 6-month data for trends
  const m0 = useTransactions({ month: months[0] });
  const m1 = useTransactions({ month: months[1] });
  const m2 = useTransactions({ month: months[2] });
  const m3 = useTransactions({ month: months[3] });
  const m4 = useTransactions({ month: months[4] });
  const m5 = useTransactions({ month: months[5] });

  const m0Data = m0.data;
  const m1Data = m1.data;
  const m2Data = m2.data;
  const m3Data = m3.data;
  const m4Data = m4.data;
  const m5Data = m5.data;

  const stats = useMemo(() => computeStats(txns || []), [txns]);
  const prevStats = useMemo(() => computeStats(prevTxns || []), [prevTxns]);
  const categories = useMemo(() => computeCategoryBreakdown(txns || []), [txns]);
  const payments = useMemo(() => computePaymentBreakdown(txns || []), [txns]);

  // Subcategory breakdown for the selected category
  const subcategoryBreakdown = useMemo(() => {
    if (!selectedCategory || !txns) return [];
    const map = new Map<string, number>();
    for (const t of txns) {
      if (t.type === 'expense' && t.category === selectedCategory && t.subtype !== 'transfer_out') {
        const sub = t.subcategory || 'General';
        map.set(sub, (map.get(sub) || 0) + t.amount);
      }
    }
    return Array.from(map.entries())
      .map(([label, amount]) => ({ label, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [selectedCategory, txns]);

  const savingsTrend = useMemo(() => {
    const allData = [m0Data, m1Data, m2Data, m3Data, m4Data, m5Data];
    const byMonth: Record<string, typeof txns> = {};
    months.forEach((mo, i) => { byMonth[mo] = allData[i] || []; });
    return computeSavingsTrend(byMonth as Record<string, NonNullable<typeof txns>>, months);
  }, [m0Data, m1Data, m2Data, m3Data, m4Data, m5Data, months]);

  const trendLabels = months.map((m) => monthLabel(m));
  const incomeData = useMemo(() => {
    const allData = [m0Data, m1Data, m2Data, m3Data, m4Data, m5Data];
    return months.map((_, i) => {
      const d = allData[i] || [];
      return d.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    });
  }, [m0Data, m1Data, m2Data, m3Data, m4Data, m5Data, months]);
  const expenseData = useMemo(() => {
    const allData = [m0Data, m1Data, m2Data, m3Data, m4Data, m5Data];
    return months.map((_, i) => {
      const d = allData[i] || [];
      return d.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    });
  }, [m0Data, m1Data, m2Data, m3Data, m4Data, m5Data, months]);

  if (isLoading) {
    return <div className="space-y-4"><SkeletonCard /><SkeletonCard className="h-[300px]" /><SkeletonCard className="h-[300px]" /></div>;
  }

  if (!txns || txns.length === 0) {
    const emptyMsg = currentMonth
      ? `No transactions for ${monthLabel(currentMonth)}. Add some to see analytics.`
      : 'No transactions found. Add some to see analytics.';
    return <EmptyState emoji="📊" message={emptyMsg} />;
  }

  const expChange = pctChange(stats.expense, prevStats.expense);
  const incChange = pctChange(stats.income, prevStats.income);

  // Format MoM sub-text with explicit direction arrow so the user doesn't
  // need to mentally invert the sign for expense cards.
  // When All Months is selected there is no previous month — show rate only.
  const fmtChange = (val: number) =>
    `${val >= 0 ? '\u2191' : '\u2193'} ${Math.abs(val).toFixed(0)}% vs last month`;
  const incomeSub  = currentMonth ? fmtChange(incChange) : `${stats.savingsRate.toFixed(0)}% savings rate`;
  const expenseSub = currentMonth ? fmtChange(expChange) : `${stats.txnCount} transactions`;
  const savingsSub = currentMonth
    ? `${stats.savingsRate.toFixed(0)}% rate`
    : `${formatCurrency(stats.balance)} net`;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-text">Analytics</h2>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Income" value={formatCurrency(stats.income)} sub={incomeSub} trend={incChange >= 0 ? 'up' : 'down'} />
        <StatCard icon={<TrendingDown className="w-5 h-5" />} label="Expense" value={formatCurrency(stats.expense)} sub={expenseSub} trend={expChange <= 0 ? 'up' : 'down'} />
        <StatCard icon={<PiggyBank className="w-5 h-5" />} label="Savings" value={formatCurrency(stats.balance)} sub={savingsSub} trend={stats.balance >= 0 ? 'up' : 'down'} />
        <StatCard icon={<CreditCard className="w-5 h-5" />} label="Avg Expense" value={formatCurrency(Math.round(stats.avgExpense))} sub={`${stats.txnCount} transactions`} />
      </div>

      {/* Savings bar chart */}
      <SectionCard title="Monthly Savings">
        <BarChart
          labels={trendLabels}
          datasets={[{ label: 'Savings', data: savingsTrend.map((s) => s.saved), color: 'var(--income)' }]}
          height="240px"
          aria-label="Monthly savings bar chart"
        />
      </SectionCard>

      {/* Trend + Payment doughnut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="6-Month Trend">
          <TrendLineChart
            labels={trendLabels}
            datasets={[
              { label: 'Income', data: incomeData, color: 'var(--income)' },
              { label: 'Expense', data: expenseData, color: 'var(--expense)' },
            ]}
            height="240px"
            aria-label="6-month income vs expense trend"
          />
        </SectionCard>

        <SectionCard title="Payment Methods">
          <div className="flex flex-col items-center gap-4">
            <CategoryDoughnut
              segments={payments.map((p, i) => ({ label: p.method, value: p.amount, color: categoryColor(i + 5) }))}
              centerLabel="Total"
              centerValue={formatCurrency(stats.expense)}
              height="200px"
            />
            <ChartLegend
              items={payments.slice(0, 6).map((p, i) => ({ label: p.method, color: categoryColor(i + 5), value: formatCurrency(p.amount) }))}
              columns={2}
              className="w-full max-w-xs"
            />
          </div>
        </SectionCard>
      </div>

      {/* Category deep-dive */}
      <SectionCard title="Category Breakdown">
        <div className="flex flex-col items-center gap-4">
          <CategoryDoughnut
            segments={categories.slice(0, 10).map((c, i) => ({ label: c.category, value: c.amount, color: categoryColor(i) }))}
            centerLabel="Expense"
            centerValue={formatCurrency(stats.expense)}
            height="260px"
          />
          {/* Clickable legend — selecting a category drills into subcategories */}
          <div className="w-full max-w-sm">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {categories.slice(0, 10).map((c, i) => (
                <button
                  key={c.category}
                  type="button"
                  onClick={() => setSelectedCategory(prev => prev === c.category ? null : c.category)}
                  className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                    selectedCategory === c.category
                      ? 'bg-accent/15 ring-1 ring-accent/30'
                      : 'hover:bg-bg-3'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: categoryColor(i) }} />
                    <span className="text-[11px] text-text-2 truncate">{c.category}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-[11px] text-text-3">{formatCurrency(c.amount)}</span>
                    <ChevronRight className={`w-3 h-3 text-text-3 transition-transform duration-200 ${
                      selectedCategory === c.category ? 'rotate-90' : ''
                    }`} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Subcategory deep-dive — shown when a category is selected */}
          {selectedCategory && subcategoryBreakdown.length > 0 && (
            <div className="w-full max-w-sm space-y-2 pt-3 border-t border-card-border/50">
              <p className="text-xs font-semibold text-text-2 uppercase tracking-wider">
                {selectedCategory} — Subcategories
              </p>
              <div className="space-y-1.5">
                {subcategoryBreakdown.map((sub, i) => {
                  const total = subcategoryBreakdown.reduce((s, x) => s + x.amount, 0);
                  const pct = total > 0 ? (sub.amount / total) * 100 : 0;
                  return (
                    <div key={sub.label} className="space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-2">{sub.label}</span>
                        <span className="text-xs text-text-3">{formatCurrency(sub.amount)} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-bg-3 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${pct}%`, backgroundColor: categoryColor(i) }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {subcategoryBreakdown.length === 1 && subcategoryBreakdown[0].label === 'General' && (
                <p className="text-[11px] text-text-3">No subcategories defined for this category.</p>
              )}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
