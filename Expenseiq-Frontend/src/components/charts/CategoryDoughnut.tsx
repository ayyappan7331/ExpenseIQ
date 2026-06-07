'use client';

// Category doughnut chart — matches legacy renderCatChart (line 2700+)
// Used on Dashboard (category widget) and Analytics (payment method).

import { Doughnut } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { ChartWrapper, useChartThemeKey } from './ChartWrapper';
import { getChartTheme, categoryColor, CHART_FONT_FAMILY, formatCurrency } from './chart-theme';

export interface DoughnutSegment {
  label: string;
  value: number;
  color?: string;
}

export interface CategoryDoughnutProps {
  segments: DoughnutSegment[];
  height?: string;
  className?: string;
  loading?: boolean;
  centerLabel?: string;
  centerValue?: string;
  formatValue?: (value: number) => string;
  'aria-label'?: string;
}

export function CategoryDoughnut({
  segments,
  height = '280px',
  className,
  loading,
  centerLabel,
  centerValue,
  formatValue = formatCurrency,
  'aria-label': ariaLabel = 'Category breakdown',
}: CategoryDoughnutProps) {
  const themeKey = useChartThemeKey();
  const t = getChartTheme();

  const empty = segments.length === 0 || segments.every((s) => s.value === 0);

  const chartData = {
    labels: segments.map((s) => s.label),
    datasets: [
      {
        data: segments.map((s) => s.value),
        backgroundColor: segments.map((s, i) => s.color || categoryColor(i)),
        borderColor: t.card,
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  };

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: t.card,
        titleColor: t.text,
        bodyColor: t.text2,
        borderColor: t.cardBorder,
        borderWidth: 1,
        padding: 10,
        titleFont: { family: CHART_FONT_FAMILY, size: 12, weight: 'bold' as const },
        bodyFont: { family: CHART_FONT_FAMILY, size: 11 },
        callbacks: {
          label: (ctx) => {
            const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0);
            const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0';
            return `${ctx.label}: ${formatValue(ctx.parsed)} (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <ChartWrapper
      height={height}
      className={className}
      loading={loading}
      empty={empty}
      emptyMessage="No category data"
      emptyEmoji="🍩"
      aria-label={ariaLabel}
    >
      <div className="relative w-full h-full">
        <Doughnut key={themeKey} data={chartData} options={options} />
        {centerLabel && centerValue && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-lg font-semibold text-text">{centerValue}</span>
            <span className="text-[10px] text-text-3">{centerLabel}</span>
          </div>
        )}
      </div>
    </ChartWrapper>
  );
}
