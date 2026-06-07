import type { ReactNode } from 'react';

export interface CategoryBadgeProps {
  icon?: ReactNode;
  label: string;
  color?: string;
  className?: string;
}

export function CategoryBadge({ icon, label, color, className = '' }: CategoryBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-bg-3 text-text-2 ${className}`}
      style={color ? { backgroundColor: `${color}15`, color } : undefined}
    >
      {icon && <span className="shrink-0 w-3.5 h-3.5">{icon}</span>}
      {label}
    </span>
  );
}
