// CSV export utility — generates a CSV string from transactions and triggers download.

import type { Transaction } from '@/lib/types/api';
import type { MonthlyStatement } from '@/app/(app)/creditcards/helpers';

const HEADERS = ['date', 'time', 'type', 'subtype', 'amount', 'category', 'subcategory', 'paymentMethod', 'paymentApp', 'notes'];

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function transactionsToCSV(transactions: Transaction[]): string {
  const rows = [HEADERS.join(',')];
  for (const t of transactions) {
    rows.push([
      t.date,
      t.time || '',
      t.type,
      t.subtype || '',
      String(t.amount),
      escapeCSV(t.category || ''),
      escapeCSV(t.subcategory || ''),
      escapeCSV(t.paymentMethod || ''),
      escapeCSV(t.paymentApp || ''),
      escapeCSV(t.notes || ''),
    ].join(','));
  }
  return rows.join('\n');
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const STATEMENT_HEADERS = [
  'Month', 'Cycle Start', 'Cycle End', 'Due Date',
  'Purchases', 'Credits', 'Statement Balance',
  'Payments After Cycle', 'Remaining Due', 'Status',
];

export function statementsToCSV(statements: MonthlyStatement[]): string {
  const rows = [STATEMENT_HEADERS.join(',')];
  for (const s of statements) {
    rows.push([
      s.monthLabel,
      s.cycleStart,
      s.cycleEnd,
      s.dueDate,
      String(s.purchases),
      String(s.credits),
      String(s.statementBalance),
      String(s.paymentsAfterCycle),
      String(s.remainingDue),
      s.status ?? '',
    ].join(','));
  }
  return rows.join('\n');
}
