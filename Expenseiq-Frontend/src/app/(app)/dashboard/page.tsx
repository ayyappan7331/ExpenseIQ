'use client';

import { useMemo } from 'react';
import { useTransactions, useGoals } from '@/lib/hooks/queries';
import { prevMonth, last6Months, monthLabel } from '@/lib/utils/dates';
import { EmptyState, PageError } from '@/components/ui';
import { useMonth } from '@/components/layout/MonthContext';
import {
  computeStats,
  computeCategoryBreakdown,
  computeMonthTrends,
  getGoalForMonth,
  generateInsights,
} from './helpers';
import {
  DashboardStatsGrid,
  TrendWidget,
  CategoryWidget,
  RecentWidget,
  InsightsWidget,
  SavingsWidget,
  DashboardSkeleton,
} from './components';

export default function DashboardPage() {
  const { month: currentMonth } = useMonth();
  const prevMo = prevMonth(currentMonth);
  const months = last6Months().reverse(); // oldest → newest for chart

  // Fetch current month + previous month transactions
  const { data: txns, isLoading: txnLoading, isError, refetch } = useTransactions({ month: currentMonth });
  const { data: prevTxns } = useTransactions({ month: prevMo });
  const { data: goals, isLoading: goalLoading } = useGoals();

  // Fetch last 6 months for trend chart
  const m0 = useTransactions({ month: months[0] });
  const m1 = useTransactions({ month: months[1] });
  const m2 = useTransactions({ month: months[2] });
  const m3 = useTransactions({ month: months[3] });
  const m4 = useTransactions({ month: months[4] });
  const m5 = useTransactions({ month: months[5] });

  const isLoading = txnLoading || goalLoading;

  // Derive stats
  const stats = useMemo(() => computeStats(txns || []), [txns]);
  const prevStats = useMemo(() => (prevTxns ? computeStats(prevTxns) : undefined), [prevTxns]);
  const categories = useMemo(() => computeCategoryBreakdown(txns || []), [txns]);
  const insights = useMemo(() => generateInsights(stats, prevStats), [stats, prevStats]);
  const goal = useMemo(() => getGoalForMonth(goals || [], currentMonth), [goals, currentMonth]);

  // Build trend data from the 6 month queries
  const m0Data = m0.data;
  const m1Data = m1.data;
  const m2Data = m2.data;
  const m3Data = m3.data;
  const m4Data = m4.data;
  const m5Data = m5.data;
  const trends = useMemo(() => {
    const byMonth: Record<string, typeof txns> = {};
    const monthData = [m0Data, m1Data, m2Data, m3Data, m4Data, m5Data];
    months.forEach((mo, i) => {
      byMonth[mo] = monthData[i] || [];
    });
    return computeMonthTrends(byMonth as Record<string, NonNullable<typeof txns>>, months);
  }, [m0Data, m1Data, m2Data, m3Data, m4Data, m5Data, months]);

  if (isLoading) return <DashboardSkeleton />;

  if (isError) return <PageError message="Failed to load dashboard data" onRetry={() => refetch()} />;

  if (!txns || txns.length === 0) {
    return (
      <div className="space-y-6">
        <DashboardStatsGrid stats={stats} />
        <EmptyState
          emoji="🚀"
          message={`No transactions for ${monthLabel(currentMonth)}. Add your first transaction to see your dashboard come alive!`}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <DashboardStatsGrid stats={stats} prevStats={prevStats} />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendWidget trends={trends} />
        <CategoryWidget categories={categories} totalExpense={stats.expense} />
      </div>

      {/* Bottom widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RecentWidget transactions={txns} />
        <InsightsWidget insights={insights} />
        <SavingsWidget goal={goal} stats={stats} />
      </div>
    </div>
  );
}
