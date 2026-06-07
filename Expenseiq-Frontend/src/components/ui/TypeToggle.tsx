'use client';

export interface TypeToggleProps {
  value: 'income' | 'expense';
  onChange: (value: 'income' | 'expense') => void;
  className?: string;
}

export function TypeToggle({ value, onChange, className = '' }: TypeToggleProps) {
  return (
    <div className={`flex p-1 bg-bg-2 rounded-xl border border-card-border ${className}`}>
      <button
        type="button"
        onClick={() => onChange('expense')}
        className={`flex-1 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
          value === 'expense'
            ? 'bg-expense text-white shadow-sm'
            : 'text-text-2 hover:text-text'
        }`}
      >
        Expense
      </button>
      <button
        type="button"
        onClick={() => onChange('income')}
        className={`flex-1 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
          value === 'income'
            ? 'bg-income text-white shadow-sm'
            : 'text-text-2 hover:text-text'
        }`}
      >
        Income
      </button>
    </div>
  );
}
