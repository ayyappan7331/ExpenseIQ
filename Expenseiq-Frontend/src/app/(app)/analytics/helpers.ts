// Analytics helpers — pure aggregation functions for the analytics page.
// Reuses computeStats/computeCategoryBreakdown from dashboard helpers
// and adds payment-method breakdown, savings trend, and comparison logic.

import type { Transaction } from '@/lib/types/api';

export interface PaymentBreakdown {
  method: string;
  amount: number;
}

export function computePaymentBreakdown(transactions: Transaction[]): PaymentBreakdown[] {
  const map = new Map<string, number>();
  for (const t of transactions) {
    // Only real expense transactions — excludes CC payment income (G-CC-01)
    // and transfer_out so inter-account moves don't appear as payment methods.
    if (t.type === 'expense' && t.subtype !== 'transfer_out') {
      const method = t.paymentMethod || 'Other';
      map.set(method, (map.get(method) || 0) + t.amount);
    }
  }
  return Array.from(map.entries())
    .map(([method, amount]) => ({ method, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export interface SavingsTrend {
  month: string;
  saved: number;
}

export function computeSavingsTrend(
  transactionsByMonth: Record<string, Transaction[]>,
  months: string[]
): SavingsTrend[] {
  return months.map((month) => {
    const txns = transactionsByMonth[month] || [];
    let income = 0;
    let expense = 0;
    for (const t of txns) {
      // Mirror dashboard/helpers.ts: exclude transfer_in and transfer_out
      // so inter-account movements don't inflate or deflate the savings figure.
      if (t.type === 'income' && t.subtype !== 'transfer_in') income += t.amount;
      else if (t.type === 'expense' && t.subtype !== 'transfer_out') expense += t.amount;
    }
    return { month, saved: Math.max(income - expense, 0) };
  });
}

export interface ComparisonResult {
  category: string;
  monthA: number;
  monthB: number;
  change: number;
  changePct: number;
}

export function computeComparison(
  txnsA: Transaction[],
  txnsB: Transaction[]
): ComparisonResult[] {
  const mapA = new Map<string, number>();
  const mapB = new Map<string, number>();
  for (const t of txnsA) {
    if (t.type === 'expense' && t.subtype !== 'transfer_out')
      mapA.set(t.category || 'Uncategorised', (mapA.get(t.category || 'Uncategorised') || 0) + t.amount);
  }
  for (const t of txnsB) {
    if (t.type === 'expense' && t.subtype !== 'transfer_out')
      mapB.set(t.category || 'Uncategorised', (mapB.get(t.category || 'Uncategorised') || 0) + t.amount);
  }
  const allCats = new Set([...mapA.keys(), ...mapB.keys()]);
  return Array.from(allCats)
    .map((category) => {
      const monthA = mapA.get(category) || 0;
      const monthB = mapB.get(category) || 0;
      const change = monthB - monthA;
      const changePct = monthA > 0 ? (change / monthA) * 100 : monthB > 0 ? 100 : 0;
      return { category, monthA, monthB, change, changePct };
    })
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
}

export function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}
