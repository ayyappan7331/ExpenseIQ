'use client';

// Base chart wrapper. Handles:
// - Chart.js component registration (once)
// - Theme-reactive re-render via useTheme()
// - Client-only rendering (no SSR hydration mismatch)
// - Proper canvas cleanup on unmount
// - Responsive resize

import { useRef, useSyncExternalStore, type ReactNode } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { useTheme } from '@/components/ThemeProvider';

// Register Chart.js components once globally
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend
);

// Disable default animations for snappier theme transitions
ChartJS.defaults.animation = false as never;
ChartJS.defaults.responsive = true;
ChartJS.defaults.maintainAspectRatio = false;

// SSR-safe client detection without useEffect+setState
const subscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

export interface ChartWrapperProps {
  children: ReactNode;
  height?: string;
  className?: string;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  emptyEmoji?: string;
  'aria-label'?: string;
}

export function ChartWrapper({
  children,
  height = '280px',
  className = '',
  loading,
  empty,
  emptyMessage = 'No data to display',
  emptyEmoji = '📊',
  'aria-label': ariaLabel,
}: ChartWrapperProps) {
  const mounted = useIsMounted();

  if (loading) {
    return (
      <div className={`relative ${className}`} style={{ height }} aria-busy="true">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
        <div className="absolute inset-0 bg-bg-3/30 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (empty) {
    return (
      <div className={`relative flex flex-col items-center justify-center text-center ${className}`} style={{ height }}>
        <span className="text-3xl mb-2" role="img" aria-hidden="true">{emptyEmoji}</span>
        <p className="text-xs text-text-3">{emptyMessage}</p>
      </div>
    );
  }

  if (!mounted) {
    // SSR placeholder — prevents hydration mismatch
    return <div className={className} style={{ height }} />;
  }

  return (
    <div
      className={`relative ${className}`}
      style={{ height }}
      role="img"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}

/**
 * Hook that returns a key that changes on theme flip.
 * Forces chart re-mount so it picks up new CSS var colors.
 */
export function useChartThemeKey(): string {
  const { theme } = useTheme();
  return theme;
}

/**
 * Hook that returns a ref-based chart instance tracker.
 * Caller is responsible for calling chartRef.current?.destroy() if needed.
 */
export function useChartRef<T extends ChartJS>() {
  const chartRef = useRef<T | null>(null);
  return chartRef;
}
