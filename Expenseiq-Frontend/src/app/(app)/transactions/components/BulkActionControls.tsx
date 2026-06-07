'use client';

import { useState, useCallback } from 'react';
import type { Transaction } from '@/lib/types/api';

export function useBulkSelection() {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const handleSelectRow = useCallback((key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((transactions: Transaction[]) => {
    setSelectedKeys(prev => 
      prev.size === transactions.length 
        ? new Set() 
        : new Set(transactions.map(t => t.id))
    );
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedKeys(new Set());
  }, []);

  const getSelectedIds = useCallback(() => {
    return Array.from(selectedKeys);
  }, [selectedKeys]);

  return {
    selectedKeys,
    selectedCount: selectedKeys.size,
    handleSelectRow,
    handleSelectAll,
    clearSelection,
    getSelectedIds,
  };
}