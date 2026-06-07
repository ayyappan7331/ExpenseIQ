'use client';

import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Transaction } from '@/lib/types/api';
import type { SortState } from '@/components/ui';
import { formatCurrency } from '@/components/charts';

export interface FilterState {
  type: 'all' | 'income' | 'expense';
  category: string;
  paymentMethod: string;
  search: string;
  quickFilter: 'none' | 'pinned' | 'favorites';
}

export function useFilterState() {
  // Seed paymentMethod from ?paymentMethod= URL param so the CC screen
  // can deep-link directly into a filtered transaction view.
  const searchParams = useSearchParams();
  const initialPaymentMethod = searchParams?.get('paymentMethod') ?? '';

  const [filters, setFilters] = useState<FilterState>({
    type: 'all',
    category: '',
    paymentMethod: initialPaymentMethod,
    search: '',
    quickFilter: 'none',
  });

  const updateFilter = useCallback((key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ type: 'all', category: '', paymentMethod: '', search: '', quickFilter: 'none' });
  }, []);

  return { filters, setFilters, updateFilter, resetFilters };
}

export function useSortState(initialSort: SortState = { key: 'date', dir: 'desc' }) {
  const [sort, setSort] = useState<SortState>(initialSort);

  const handleSort = useCallback((key: string) => {
    setSort(prev => ({ 
      key, 
      dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc' 
    }));
  }, []);

  return {
    sort,
    setSort,
    handleSort,
  };
}

export function useTransactionFiltering(
  transactions: Transaction[],
  filters: FilterState,
  sort: SortState,
  pinnedIds?: Set<string>,
  favoritedIds?: Set<string>
) {
  return useMemo(() => {
    if (!transactions) return [];

    let list = [...transactions];

    // Quick state filters
    if (filters.quickFilter === 'pinned' && pinnedIds) {
      list = list.filter(t => pinnedIds.has(t.id));
    } else if (filters.quickFilter === 'favorites' && favoritedIds) {
      list = list.filter(t => favoritedIds.has(t.id));
    }

    // Type filter
    if (filters.type !== 'all') {
      list = list.filter(t => t.type === filters.type);
    }

    if (filters.category) {
      list = list.filter(t => t.category === filters.category);
    }

    if (filters.paymentMethod) {
      list = list.filter(t => t.paymentMethod === filters.paymentMethod);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(t =>
        (t.category || '').toLowerCase().includes(q) ||
        (t.subcategory || '').toLowerCase().includes(q) ||
        (t.notes || '').toLowerCase().includes(q) ||
        (t.source || '').toLowerCase().includes(q) ||
        (t.paymentMethod || '').toLowerCase().includes(q) ||
        (t.paymentApp || '').toLowerCase().includes(q) ||
        // Match raw number (e.g. "1500"), locale string ("1,500"), and
        // currency-formatted string ("₹1,500") so users can search naturally
        String(t.amount).includes(q) ||
        formatCurrency(t.amount).toLowerCase().includes(q)
      );
    }

    // Sort — pinned rows always float to top
    list.sort((a, b) => {
      const aPinned = pinnedIds?.has(a.id) ? 1 : 0;
      const bPinned = pinnedIds?.has(b.id) ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;

      let cmp = 0;
      if (sort.key === 'date') {
        // Primary: date. Secondary: time DESC (latest time first within same date).
        cmp = a.date.localeCompare(b.date);
        if (cmp === 0) {
          // Missing time sorts as '00:00' so it falls below timed entries when desc
          const aTime = a.time || '00:00';
          const bTime = b.time || '00:00';
          cmp = aTime.localeCompare(bTime);
        }
      } else if (sort.key === 'amount') {
        cmp = a.amount - b.amount;
      } else if (sort.key === 'category') {
        cmp = (a.category || '').localeCompare(b.category || '');
      }
      return sort.dir === 'desc' ? -cmp : cmp;
    });

    return list;
  }, [transactions, filters, sort, pinnedIds, favoritedIds]);
}

export function useUniqueCategories(transactions: Transaction[]) {
  return useMemo(() => {
    if (!transactions) return [];
    const set = new Set<string>();
    for (const t of transactions) {
      if (t.category) set.add(t.category);
    }
    return Array.from(set).sort();
  }, [transactions]);
}