'use client';

import { SectionCard } from '@/components/ui';
import { CategoryDoughnut, ChartLegend, categoryColor, formatCurrency } from '@/components/charts';
import type { CategoryBreakdown } from '../helpers';

interface Props {
  categories: CategoryBreakdown[];
  totalExpense: number;
}

export function CategoryWidget({ categories, totalExpense }: Props) {
  const top = categories.slice(0, 8);
  return (
    <SectionCard title="Category Breakdown">
      <div className="flex flex-col items-center gap-4">
        <CategoryDoughnut
          segments={top.map((c, i) => ({ label: c.category, value: c.amount, color: categoryColor(i) }))}
          centerLabel="Total"
          centerValue={formatCurrency(totalExpense)}
          height="220px"
        />
        <ChartLegend
          items={top.map((c, i) => ({
            label: c.category,
            color: categoryColor(i),
            value: formatCurrency(c.amount),
          }))}
          columns={2}
          className="w-full max-w-xs"
        />
      </div>
    </SectionCard>
  );
}
