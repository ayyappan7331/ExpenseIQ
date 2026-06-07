'use client';

// Trend line chart — matches legacy renderTrendChart('trendChart','trend')
// Used on Dashboard (widget) and Analytics page.

import { Line } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { ChartWrapper, useChartThemeKey } from './ChartWrapper';
import { getChartTheme, getChartDefaults, formatCurrency, CHART_FONT_FAMILY } from './chart-theme';

export interface TrendLineDataset {
  label: string;
  data: number[];
  color?: string;
  dashed?: boolean;
}

export interface TrendLineChartProps {
  labels: string[];
  datasets: TrendLineDataset[];
  height?: string;
  className?: string;
  loading?: boolean;
  formatY?: (value: number) => string;
  'aria-label'?: string;
}

// Resolve a color value — if it's a CSS var() string, read it from the DOM.
function resolveColor(color: string | undefined, fallback: string): string {
  if (!color) return fallback;
  const match = color.match(/^var\(([^)]+)\)$/);
  if (match) {
    const resolved = typeof window !== 'undefined'
      ? getComputedStyle(document.documentElement).getPropertyValue(match[1]).trim()
      : '';
    return resolved || fallback;
  }
  return color;
}

export function TrendLineChart({
  labels,
  datasets,
  height = '280px',
  className,
  loading,
  formatY = formatCurrency,
  'aria-label': ariaLabel = 'Trend chart',
}: TrendLineChartProps) {
  const themeKey = useChartThemeKey();
  const t = getChartTheme();
  const defaults = getChartDefaults();

  const empty = datasets.every((ds) => ds.data.every((v) => v === 0));

  const chartData = {
    labels,
    datasets: datasets.map((ds, i) => {
      const color = resolveColor(ds.color, i === 0 ? t.accent : t.accent2);
      return {
        label: ds.label,
        data: ds.data,
        borderColor: color,
        backgroundColor: `${color}20`,
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: color,
        tension: 0.4,
        fill: i === 0,
        borderDash: ds.dashed ? [5, 5] : undefined,
      };
    }),
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: datasets.length > 1,
        position: 'top',
        labels: { ...defaults.legend.labels, usePointStyle: true, pointStyle: 'circle', padding: 16 },
      },
      tooltip: {
        backgroundColor: t.card,
        titleColor: t.text,
        bodyColor: t.text2,
        borderColor: t.cardBorder,
        borderWidth: 1,
        padding: 10,
        titleFont: { family: CHART_FONT_FAMILY, size: 12, weight: 'bold' as const },
        bodyFont: { family: CHART_FONT_FAMILY, size: 11 },
        callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatY(ctx.parsed.y ?? 0)}` },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: defaults.ticks },
      y: {
        grid: defaults.grid,
        ticks: { ...defaults.ticks, callback: (v) => formatY(Number(v ?? 0)) },
      },
    },
  };

  return (
    <ChartWrapper
      height={height}
      className={className}
      loading={loading}
      empty={empty}
      emptyMessage="No trend data yet"
      emptyEmoji="📈"
      aria-label={ariaLabel}
    >
      <Line key={themeKey} data={chartData} options={options} />
    </ChartWrapper>
  );
}
