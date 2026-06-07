'use client';

import { forwardRef } from 'react';

interface EditableAmountCellProps {
  amount: string;
  type: 'expense' | 'income';
  onAmountChange: (amount: string) => void;
  onTypeChange: (type: 'expense' | 'income') => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  'aria-label'?: string;
  disabled?: boolean;
  hasError?: boolean;
}

const inputCls =
  'w-full px-2 py-1 text-xs bg-bg-3 border border-card-border rounded-lg text-text placeholder:text-text-3 focus:outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent transition-colors text-right appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

const inputErrorCls =
  'w-full px-2 py-1 text-xs bg-bg-3 border border-red-400 rounded-lg text-text placeholder:text-text-3 focus:outline-none focus:ring-1 focus:ring-red-400/50 focus:border-red-400 transition-colors text-right appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

export const EditableAmountCell = forwardRef<HTMLInputElement, EditableAmountCellProps>(
  ({ amount, type, onAmountChange, onTypeChange, onKeyDown, placeholder, className, disabled, hasError, ...props }, ref) => {
    void type; void onTypeChange; // type is now derived from category; kept in props for API compatibility

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      const raw = e.clipboardData.getData('text');
      const cleaned = raw.replace(/[^0-9.]/g, '');
      if (cleaned && cleaned !== raw) {
        e.preventDefault();
        onAmountChange(cleaned);
      }
    };

    return (
      <input
        ref={ref}
        type="number"
        placeholder={placeholder || 'Amount *'}
        value={amount}
        onChange={(e) => onAmountChange(e.target.value)}
        onKeyDown={onKeyDown}
        onPaste={handlePaste}
        className={className || (hasError ? inputErrorCls : inputCls)}
        min="0"
        step="any"
        disabled={disabled}
        {...props}
      />
    );
  }
);

EditableAmountCell.displayName = 'EditableAmountCell';
