'use client';

import { SectionCard } from '@/components/ui';
import { TrendLineChart } from '@/components/charts';
import { monthLabel } from '@/lib/utils/dates';
import type { MonthTrend } from '../helpers';

interface Props {
  trends: MonthTrend[];
}

export function TrendWidget({ trends }: Props) {
  const labels = trends.map((t) => monthLabel(t.month));
  return (
    <SectionCard title="Spending Trend">
      <TrendLineChart
        labels={labels}
        datasets={[
          { label: 'Income', data: trends.map((d) => d.income), color: 'var(--income)' },
          { label: 'Expense', data: trends.map((d) => d.expense), color: 'var(--expense)' },
        ]}
        height="260px"
        aria-label="6-month income vs expense trend"
      />
    </SectionCard>
  );
}
