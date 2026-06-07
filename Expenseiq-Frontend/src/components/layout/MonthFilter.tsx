'use client';

import { last6Months, monthLabel } from '@/lib/utils/dates';
import { useMonth } from './MonthContext';

/** Sentinel value — empty string means "all months" (no date filter). */
export const ALL_MONTHS = '';

export function MonthFilter() {
  const { month, setMonth, disabled } = useMonth();
  const months = last6Months();

  return (
    <select
      value={month}
      onChange={(e) => setMonth(e.target.value)}
      disabled={disabled}
      aria-label="Month filter"
      title={disabled ? 'Month filter is not applicable on this screen' : undefined}
      className={[
        'px-2.5 py-1.5 rounded-lg text-sm border transition-colors',
        disabled
          ? 'bg-bg-2 text-text-3 border-card-border/40 cursor-not-allowed opacity-50'
          : 'bg-bg-3 text-text border-card-border hover:border-text-3 focus:outline-none focus:border-accent',
      ].join(' ')}
    >
      {/* "All" lets the user see every transaction regardless of month */}
      <option key="all" value={ALL_MONTHS} className="bg-bg-2 text-text">
        All
      </option>
      {months.map((m) => (
        <option key={m} value={m} className="bg-bg-2 text-text">
          {monthLabel(m)}
        </option>
      ))}
    </select>
  );
}
