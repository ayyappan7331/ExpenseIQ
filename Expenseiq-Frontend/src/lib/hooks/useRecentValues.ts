'use client';

import { useMemo } from 'react';
import { useTransactions } from '@/lib/hooks/queries';
import { todayMonth } from '@/lib/utils/dates';

interface RecentValues {
  categories: string[];
  subcategories: string[];
  paymentMethods: string[];
  notes: string[];
}

/**
 * Hook to track recently used values for transaction form assistance
 * Analyzes recent transactions to suggest commonly used values
 */
export function useRecentValues(limit = 5): RecentValues {
  const currentMonth = todayMonth();
  const { data: transactions } = useTransactions({ month: currentMonth });

  return useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return {
        categories: [],
        subcategories: [],
        paymentMethods: [],
        notes: [],
      };
    }

    // Sort by date (most recent first) and take last 20 transactions for analysis
    const recentTxns = [...transactions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 20);

    // Count frequency of each value type
    const categoryCount = new Map<string, number>();
    const subcategoryCount = new Map<string, number>();
    const paymentMethodCount = new Map<string, number>();
    const notesCount = new Map<string, number>();

    recentTxns.forEach(txn => {
      if (txn.category) {
        categoryCount.set(txn.category, (categoryCount.get(txn.category) || 0) + 1);
      }
      if (txn.subcategory) {
        subcategoryCount.set(txn.subcategory, (subcategoryCount.get(txn.subcategory) || 0) + 1);
      }
      if (txn.paymentMethod) {
        paymentMethodCount.set(txn.paymentMethod, (paymentMethodCount.get(txn.paymentMethod) || 0) + 1);
      }
      if (txn.notes && txn.notes.trim()) {
        notesCount.set(txn.notes.trim(), (notesCount.get(txn.notes.trim()) || 0) + 1);
      }
    });

    // Helper to get top N values by frequency
    const getTopValues = (countMap: Map<string, number>, maxCount: number) => {
      return Array.from(countMap.entries())
        .sort((a, b) => b[1] - a[1]) // Sort by count descending
        .slice(0, maxCount)
        .map(([value]) => value);
    };

    return {
      categories: getTopValues(categoryCount, limit),
      subcategories: getTopValues(subcategoryCount, limit),
      paymentMethods: getTopValues(paymentMethodCount, limit),
      notes: getTopValues(notesCount, limit),
    };
  }, [transactions, limit]);
}

/**
 * Hook to get recent values for a specific category
 * Useful for showing subcategories and payment methods commonly used with a category
 */
export function useRecentValuesForCategory(category: string, limit = 3) {
  const currentMonth = todayMonth();
  const { data: transactions } = useTransactions({ month: currentMonth });

  return useMemo(() => {
    if (!transactions || !category) {
      return { subcategories: [], paymentMethods: [] };
    }

    // Filter transactions for this category and sort by date
    const categoryTxns = transactions
      .filter(txn => txn.category === category)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10); // Last 10 transactions in this category

    const subcategoryCount = new Map<string, number>();
    const paymentMethodCount = new Map<string, number>();

    categoryTxns.forEach(txn => {
      if (txn.subcategory) {
        subcategoryCount.set(txn.subcategory, (subcategoryCount.get(txn.subcategory) || 0) + 1);
      }
      if (txn.paymentMethod) {
        paymentMethodCount.set(txn.paymentMethod, (paymentMethodCount.get(txn.paymentMethod) || 0) + 1);
      }
    });

    const getTopValues = (countMap: Map<string, number>, maxCount: number) => {
      return Array.from(countMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxCount)
        .map(([value]) => value);
    };

    return {
      subcategories: getTopValues(subcategoryCount, limit),
      paymentMethods: getTopValues(paymentMethodCount, limit),
    };
  }, [transactions, category, limit]);
}