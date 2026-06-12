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

  // Fetch ALL transactions once to avoid N+1 queries
  const { data: allTxns, isLoading: txnLoading, isError, refetch } = useTransactions();
  const { data: goals, isLoading: goalLoading } = useGoals();

  const isLoading = txnLoading || goalLoading;

  // Filter transactions locally
  const txns = useMemo(() => allTxns?.filter((t) => t.date.startsWith(currentMonth)) || [], [allTxns, currentMonth]);
  const prevTxns = useMemo(() => allTxns?.filter((t) => t.date.startsWith(prevMo)) || [], [allTxns, prevMo]);

  // Derive stats
  const stats = useMemo(() => computeStats(txns), [txns]);
  const prevStats = useMemo(() => computeStats(prevTxns), [prevTxns]);
  const categories = useMemo(() => computeCategoryBreakdown(txns), [txns]);
  const insights = useMemo(() => generateInsights(stats, prevStats), [stats, prevStats]);
  const goal = useMemo(() => getGoalForMonth(goals || [], currentMonth), [goals, currentMonth]);

  // Build trend data from local filtering
  const trends = useMemo(() => {
    const byMonth: Record<string, typeof txns> = {};
    months.forEach((mo) => {
      byMonth[mo] = allTxns?.filter((t) => t.date.startsWith(mo)) || [];
    });
    return computeMonthTrends(byMonth, months);
  }, [allTxns, months]);

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
