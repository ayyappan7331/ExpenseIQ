'use client';

import { useState, useCallback } from 'react';
import type { TransactionGroup } from '@/lib/utils/dates';

export function useGroupCollapse() {
  // Store collapsed group labels — empty set means all expanded
  const [collapsed, setCollapsed] = useState<Set<TransactionGroup>>(new Set());

  const toggle = useCallback((label: TransactionGroup) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }, []);

  const isCollapsed = useCallback(
    (label: TransactionGroup) => collapsed.has(label),
    [collapsed]
  );

  return { isCollapsed, toggle };
}
