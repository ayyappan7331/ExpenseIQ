'use client';

import { forwardRef, useCallback } from 'react';

interface EditableTextareaCellProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  'aria-label'?: string;
  disabled?: boolean;
}

const textareaCls =
  'w-full px-2 py-1 text-xs bg-bg-3 border border-card-border rounded-lg text-text placeholder:text-text-3 focus:outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent transition-colors leading-5 min-h-[28px] max-h-[120px] overflow-y-hidden resize-none';

export const EditableTextareaCell = forwardRef<HTMLTextAreaElement, EditableTextareaCellProps>(
  ({ value, onChange, onKeyDown, placeholder, rows = 1, className, disabled, ...props }, ref) => {
    // Auto-expand height on input
    const handleInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
      const el = e.currentTarget;
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }, []);

    return (
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onInput={handleInput}
        placeholder={placeholder}
        rows={rows}
        className={className || textareaCls}
        disabled={disabled}
        {...props}
      />
    );
  }
);

EditableTextareaCell.displayName = 'EditableTextareaCell';
