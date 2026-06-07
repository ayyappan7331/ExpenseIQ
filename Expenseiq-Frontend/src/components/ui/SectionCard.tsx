import type { ReactNode } from 'react';

export interface SectionCardProps {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padding?: boolean;
}

export function SectionCard({ title, actions, children, className = '', padding = true }: SectionCardProps) {
  return (
    <div className={`glass-surface bg-card border border-card-border rounded-2xl shadow-[var(--shadow)] ${className}`}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-card-border">
        <h3 className="text-sm font-semibold text-text">{title}</h3>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className={padding ? 'p-5' : ''}>{children}</div>
    </div>
  );
}
