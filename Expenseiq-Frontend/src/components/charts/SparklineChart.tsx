'use client';

// Mini sparkline — a tiny line chart without axes/labels/legend.
// Used inline in stat cards or list rows to show micro-trends.

import { Line } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { useChartThemeKey } from './ChartWrapper';
import { getChartTheme } from './chart-theme';
import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

export interface SparklineChartProps {
  data: number[];
  color?: string;
  height?: string;
  width?: string;
  className?: string;
}

export function SparklineChart({
  data,
  color,
  height = '32px',
  width = '80px',
  className = '',
}: SparklineChartProps) {
  const themeKey = useChartThemeKey();
  const t = getChartTheme();
  const mounted = useIsMounted();

  if (!mounted || data.length < 2) return <div style={{ width, height }} />;

  const lineColor = color || t.accent;

  const chartData = {
    labels: data.map((_, i) => String(i)),
    datasets: [
      {
        data,
        borderColor: lineColor,
        backgroundColor: `${lineColor}20`,
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: {
      x: { display: false },
      y: { display: false },
    },
    elements: { point: { radius: 0 } },
  };

  return (
    <div className={className} style={{ width, height }}>
      <Line key={themeKey} data={chartData} options={options} />
    </div>
  );
}
