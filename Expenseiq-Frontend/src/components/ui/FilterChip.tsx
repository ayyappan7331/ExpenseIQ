'use client';

export interface FilterChipProps {
  label: string;
  active?: boolean;
  onClick: () => void;
  className?: string;
}

export function FilterChip({ label, active, onClick, className = '' }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
        active
          ? 'bg-accent/15 text-accent border-accent/30'
          : 'bg-bg-2 text-text-2 border-card-border hover:bg-bg-3 hover:text-text'
      } ${className}`}
    >
      {label}
    </button>
  );
}
