import type { Transaction } from '@/lib/types/api';

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportJSON(transactions: Transaction[], filename: string): void {
  const payload = {
    exportedAt: new Date().toISOString(),
    count: transactions.length,
    transactions: transactions.map(t => ({
      date: t.date,
      time: t.time ?? null,
      type: t.type,
      subtype: t.subtype ?? null,
      amount: t.amount,
      category: t.category ?? null,
      subcategory: t.subcategory ?? null,
      paymentMethod: t.paymentMethod ?? null,
      paymentApp: t.paymentApp ?? null,
      notes: t.notes ?? null,
    })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  downloadBlob(blob, filename);
}
