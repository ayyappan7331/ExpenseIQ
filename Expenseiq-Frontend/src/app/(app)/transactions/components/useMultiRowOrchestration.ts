'use client';

import { useState, useCallback } from 'react';
import type { Transaction } from '@/lib/types/api';

export const MAX_QUICK_ADD_ROWS = 10;

export interface QuickAddRow {
  /** Stable temporary ID for React key — never sent to backend */
  id: string;
  duplicateFrom?: Transaction;
}

let _seq = 0;
function nextRowId(): string {
  return `qa-${++_seq}`;
}

/**
 * Manages up to MAX_QUICK_ADD_ROWS simultaneous unsaved quick-add rows.
 * Each row is independent — adding, saving, or cancelling one does not affect others.
 */
export function useMultiRowOrchestration() {
  const [rows, setRows] = useState<QuickAddRow[]>([]);

  const addRow = useCallback(() => {
    setRows(prev => {
      if (prev.length >= MAX_QUICK_ADD_ROWS) return prev;
      return [...prev, { id: nextRowId() }];
    });
  }, []);

  const addDuplicateRow = useCallback((txn: Transaction) => {
    setRows(prev => {
      if (prev.length >= MAX_QUICK_ADD_ROWS) return prev;
      return [...prev, { id: nextRowId(), duplicateFrom: txn }];
    });
  }, []);

  const removeRow = useCallback((id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
  }, []);

  const clearAllRows = useCallback(() => {
    setRows([]);
  }, []);

  return {
    rows,
    rowCount: rows.length,
    atMax: rows.length >= MAX_QUICK_ADD_ROWS,
    addRow,
    addDuplicateRow,
    removeRow,
    clearAllRows,
  };
}
