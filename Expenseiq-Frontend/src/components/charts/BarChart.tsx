'use client';

// Bar chart — matches legacy renderSavingsChart (analytics) and
// renderCompare (compare page). Supports grouped and stacked modes.

import { Bar } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { ChartWrapper, useChartThemeKey } from './ChartWrapper';
import { getChartTheme, getChartDefaults, formatCurrency, CHART_FONT_FAMILY } from './chart-theme';

export interface BarDataset {
  label: string;
  data: number[];
  color?: string;
}

export interface BarChartProps {
  labels: string[];
  datasets: BarDataset[];
  height?: string;
  className?: string;
  loading?: boolean;
  stacked?: boolean;
  horizontal?: boolean;
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

export function BarChart({
  labels,
  datasets,
  height = '280px',
  className,
  loading,
  stacked = false,
  horizontal = false,
  formatY = formatCurrency,
  'aria-label': ariaLabel = 'Bar chart',
}: BarChartProps) {
  const themeKey = useChartThemeKey();
  const t = getChartTheme();
  const defaults = getChartDefaults();

  const empty = datasets.every((ds) => ds.data.every((v) => v === 0));

  const chartData = {
    labels,
    datasets: datasets.map((ds, i) => ({
      label: ds.label,
      data: ds.data,
      backgroundColor: resolveColor(
        ds.color,
        i === 0 ? t.income : i === 1 ? t.expense : t.accent
      ),
      borderRadius: 6,
      borderSkipped: false as const,
      maxBarThickness: 40,
    })),
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? 'y' : 'x',
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: datasets.length > 1,
        position: 'top',
        labels: { ...defaults.legend.labels, usePointStyle: true, pointStyle: 'rectRounded', padding: 16 },
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
      x: {
        grid: { display: false },
        ticks: defaults.ticks,
        stacked,
      },
      y: {
        grid: defaults.grid,
        ticks: { ...defaults.ticks, callback: (v) => formatY(Number(v ?? 0)) },
        stacked,
      },
    },
  };

  return (
    <ChartWrapper
      height={height}
      className={className}
      loading={loading}
      empty={empty}
      emptyMessage="No data to compare"
      emptyEmoji="📊"
      aria-label={ariaLabel}
    >
      <Bar key={themeKey} data={chartData} options={options} />
    </ChartWrapper>
  );
}
