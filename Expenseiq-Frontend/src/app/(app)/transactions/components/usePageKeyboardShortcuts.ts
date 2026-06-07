'use client';

import { useEffect } from 'react';

interface PageShortcutsOptions {
  onNewRow: () => void;
  onFocusSearch: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  isRowOpen: boolean;
  isAnyModalOpen: boolean;
}

/**
 * Registers page-level keyboard shortcuts for the transactions page.
 * Guards against firing when focus is inside an input/textarea/select.
 */
export function usePageKeyboardShortcuts({
  onNewRow,
  onFocusSearch,
  searchInputRef,
  isRowOpen,
  isAnyModalOpen,
}: PageShortcutsOptions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Never fire when a modal/drawer is open
      if (isAnyModalOpen) return;

      const target = e.target as HTMLElement;
      const inInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      // N — open new inline row
      if (e.key === 'n' && !inInput && !isRowOpen && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onNewRow();
        return;
      }

      // Space — focus search input (only when not in any input)
      if (e.key === ' ' && !inInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onNewRow, onFocusSearch, searchInputRef, isRowOpen, isAnyModalOpen]);
}
