'use client';

import { Search } from 'lucide-react';
import { FilterChip } from '@/components/ui';
import type { FilterState } from './FilterStateHelpers';

export type { FilterState };

type QuickFilter = FilterState['quickFilter'];
type TypeFilter = FilterState['type'];

interface Props {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  categories: string[];
  paymentMethods?: string[];
  pinnedCount?: number;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
];

const QUICK_FILTERS: { value: QuickFilter; label: string }[] = [
  { value: 'pinned',    label: 'Pinned' },
  { value: 'favorites', label: 'Favorites' },
];

export function TransactionFilters({ filters, onChange, categories, paymentMethods = [], searchInputRef }: Props) {
  const setType = (value: TypeFilter) => onChange({ ...filters, type: value });
  const toggleQuick = (value: QuickFilter) =>
    onChange({ ...filters, quickFilter: filters.quickFilter === value ? 'none' : value });

  return (
    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
      {/* Type chips */}
      {TYPE_FILTERS.map(({ value, label }) => (
        <FilterChip
          key={value}
          label={label}
          active={filters.type === value}
          onClick={() => setType(value)}
        />
      ))}

      <span className="w-px h-4 bg-card-border flex-shrink-0" aria-hidden />

      {/* Quick filter chips */}
      {QUICK_FILTERS.map(({ value, label }) => (
        <FilterChip
          key={value}
          label={label}
          active={filters.quickFilter === value}
          onClick={() => toggleQuick(value)}
        />
      ))}

      <span className="w-px h-4 bg-card-border flex-shrink-0" aria-hidden />

      {/* Search — pushed to far right via ml-auto */}
      <div className="relative flex-shrink-0 ml-auto">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-3" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="w-72 pl-8 pr-2 py-1.5 text-xs bg-bg-2 border border-card-border rounded-lg text-text placeholder:text-text-3 focus:outline-none focus:ring-1 focus:ring-accent/40 focus:w-80 transition-all duration-200"
          aria-label="Search transactions"
        />
      </div>

      {/* Category select */}
      {categories.length > 0 && (
        <select
          value={filters.category}
          onChange={(e) => onChange({ ...filters, category: e.target.value })}
          className="px-2 py-1.5 text-xs bg-bg-2 border border-card-border rounded-lg text-text focus:outline-none focus:ring-1 focus:ring-accent/40 appearance-none flex-shrink-0"
          aria-label="Filter by category"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      )}

      {/* Payment method select */}
      {paymentMethods.length > 0 && (
        <select
          value={filters.paymentMethod}
          onChange={(e) => onChange({ ...filters, paymentMethod: e.target.value })}
          className="px-2 py-1.5 text-xs bg-bg-2 border border-card-border rounded-lg text-text focus:outline-none focus:ring-1 focus:ring-accent/40 appearance-none flex-shrink-0"
          aria-label="Filter by payment method"
        >
          <option value="">All Methods</option>
          {paymentMethods.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      )}
    </div>
  );
}
