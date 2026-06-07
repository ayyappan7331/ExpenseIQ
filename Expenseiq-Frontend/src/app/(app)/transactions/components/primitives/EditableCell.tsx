'use client';

import { forwardRef, memo, useCallback } from 'react';

interface EditableCellProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: 'text' | 'number' | 'date' | 'time';
  min?: string;
  step?: string;
  className?: string;
  'aria-label'?: string;
  disabled?: boolean;
}

const inputCls =
  'w-full px-2 py-1 text-xs bg-bg-3 border border-card-border rounded-lg text-text placeholder:text-text-3 focus:outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent transition-colors';

// Memoized to prevent unnecessary rerenders during typing
export const EditableCell = memo(forwardRef<HTMLInputElement, EditableCellProps>(
  ({ value, onChange, onKeyDown, placeholder, type = 'text', min, step, className, disabled, ...props }, ref) => {
    // Memoize the change handler to prevent recreation on every render
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    }, [onChange]);

    return (
      <input
        ref={ref}
        type={type}
        value={value}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        min={min}
        step={step}
        className={className || inputCls}
        disabled={disabled}
        {...props}
      />
    );
  }
));

EditableCell.displayName = 'EditableCell';