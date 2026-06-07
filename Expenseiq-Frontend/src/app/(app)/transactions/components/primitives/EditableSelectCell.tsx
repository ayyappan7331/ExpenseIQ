'use client';

import { forwardRef, memo, useCallback } from 'react';

interface EditableSelectCellProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLSelectElement>) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  className?: string;
  'aria-label'?: string;
  disabled?: boolean;
  hasError?: boolean;
}

const selectCls =
  'w-full px-2 py-1 text-xs bg-bg-3 border border-card-border rounded-lg text-text focus:outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent transition-colors appearance-none';

const selectErrorCls =
  'w-full px-2 py-1 text-xs bg-bg-3 border border-red-400 rounded-lg text-text focus:outline-none focus:ring-1 focus:ring-red-400/50 focus:border-red-400 transition-colors appearance-none';

// Memoized to prevent unnecessary rerenders when options don't change
export const EditableSelectCell = memo(forwardRef<HTMLSelectElement, EditableSelectCellProps>(
  ({ value, onChange, onKeyDown, options, placeholder, className, disabled, hasError, ...props }, ref) => {
    const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(e.target.value);
    }, [onChange]);

    const baseClass = hasError ? selectErrorCls : selectCls;

    return (
      <select
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        className={className || `${baseClass} ${disabled ? 'disabled:opacity-40' : ''}`}
        disabled={disabled}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
));

EditableSelectCell.displayName = 'EditableSelectCell';