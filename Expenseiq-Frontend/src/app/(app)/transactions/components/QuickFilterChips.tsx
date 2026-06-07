'use client';

import { FilterChip } from '@/components/ui';
import type { FilterState } from './FilterStateHelpers';

interface QuickFilterChipsProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  pinnedCount: number;
}

type QuickFilter = FilterState['quickFilter'];
type TypeFilter = FilterState['type'];

const QUICK_FILTERS: { value: QuickFilter; label: string }[] = [
  { value: 'pinned', label: 'Pinned' },
  { value: 'favorites', label: 'Favorites' },
];

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
];

export function QuickFilterChips({ filters, onChange, pinnedCount }: QuickFilterChipsProps) {
  const setQuickFilter = (value: QuickFilter) => {
    onChange({
      ...filters,
      quickFilter: filters.quickFilter === value ? 'none' : value,
    });
  };

  const setTypeFilter = (value: TypeFilter) => {
    onChange({ ...filters, type: value });
  };

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick filters">
      {/* Type filters */}
      {TYPE_FILTERS.map(({ value, label }) => (
        <FilterChip
          key={value}
          label={label}
          active={filters.type === value}
          onClick={() => setTypeFilter(value)}
        />
      ))}

      {/* Divider */}
      <span className="w-px bg-card-border self-stretch mx-0.5" aria-hidden />

      {/* Quick date/state filters */}
      {QUICK_FILTERS.map(({ value, label }) => {
        if (value === 'pinned' && pinnedCount === 0) return null;
        return (
          <FilterChip
            key={value}
            label={value === 'pinned' ? `Pinned (${pinnedCount})` : label}
            active={filters.quickFilter === value}
            onClick={() => setQuickFilter(value)}
          />
        );
      })}
    </div>
  );
}
