import type { ReactNode } from 'react';

export interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  trend?: 'up' | 'down' | 'flat';
  className?: string;
}

const trendColors = {
  up: 'text-income',
  down: 'text-expense',
  flat: 'text-text-3',
};

export function StatCard({ icon, label, value, sub, trend, className = '' }: StatCardProps) {
  return (
    <div className={`glass-surface bg-card border border-card-border rounded-2xl p-4 flex items-start gap-3 shadow-[var(--shadow)] ${className}`}>
      <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-text-3 truncate">{label}</p>
        <p className="text-lg font-semibold text-text leading-tight mt-0.5 truncate">{value}</p>
        {sub && (
          <p className={`text-[11px] mt-0.5 truncate ${trend ? trendColors[trend] : 'text-text-3'}`}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}
