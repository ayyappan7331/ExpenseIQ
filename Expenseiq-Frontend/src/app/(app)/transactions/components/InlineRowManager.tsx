'use client';

import { useState, useCallback } from 'react';
import type { Transaction } from '@/lib/types/api';

export interface InlineRowState {
  showInlineRow: boolean;
  duplicateTransaction?: Transaction;
}

export function useInlineRowManager() {
  const [state, setState] = useState<InlineRowState>({
    showInlineRow: false,
    duplicateTransaction: undefined,
  });

  const showInlineRowFn = useCallback(() => {
    setState({ showInlineRow: true, duplicateTransaction: undefined });
  }, []);

  const showInlineRowWithDuplicate = useCallback((transaction: Transaction) => {
    setState({ showInlineRow: true, duplicateTransaction: transaction });
  }, []);

  const hideInlineRow = useCallback(() => {
    setState({ showInlineRow: false, duplicateTransaction: undefined });
  }, []);

  return {
    showInlineRow: state.showInlineRow,
    duplicateTransaction: state.duplicateTransaction,
    showInlineRowFn,
    showInlineRowWithDuplicate,
    hideInlineRow,
  };
}