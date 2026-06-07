import type { ReactNode } from 'react';

export type BadgeVariant = 'default' | 'income' | 'expense' | 'warning' | 'accent';

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-bg-3 text-text-2',
  income: 'bg-income/15 text-income',
  expense: 'bg-expense/15 text-expense',
  warning: 'bg-warning/15 text-warning',
  accent: 'bg-accent/15 text-accent',
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}
