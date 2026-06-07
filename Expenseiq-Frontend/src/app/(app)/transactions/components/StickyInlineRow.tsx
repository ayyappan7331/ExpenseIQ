'use client';

import { InlineTransactionRowEnhanced } from './InlineTransactionRowEnhanced';
import type { Transaction } from '@/lib/types/api';

interface StickyInlineRowProps {
  show: boolean;
  onClose: () => void;
  duplicateFrom?: Transaction;
}

/**
 * Renders the inline add-row above the transaction table.
 * Uses the same min-width as TransactionTable so horizontal scroll stays in sync.
 */
export function StickyInlineRow({ show, onClose, duplicateFrom }: StickyInlineRowProps) {
  if (!show) return null;

  return (
    <div className="overflow-x-auto border-b-2 border-accent/30 bg-accent/5">
      <div className="min-w-[600px]">
        <table className="w-full text-sm">
          <tbody>
            <InlineTransactionRowEnhanced onClose={onClose} duplicateFrom={duplicateFrom} />
          </tbody>
        </table>
      </div>
    </div>
  );
}
