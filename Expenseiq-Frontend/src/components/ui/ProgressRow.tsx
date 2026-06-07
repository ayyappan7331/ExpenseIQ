export interface ProgressRowProps {
  label: string;
  value: number;
  max: number;
  color?: string;
  formatValue?: (value: number) => string;
  formatMax?: (max: number) => string;
  className?: string;
}

export function ProgressRow({
  label,
  value,
  max,
  color,
  formatValue = (v) => String(v),
  formatMax = (m) => String(m),
  className = '',
}: ProgressRowProps) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const isOver = value > max;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-2 truncate">{label}</span>
        <span className={`font-medium ${isOver ? 'text-expense' : 'text-text'}`}>
          {formatValue(value)} / {formatMax(max)}
        </span>
      </div>
      <div className="h-2 bg-bg-3 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{
            width: `${pct}%`,
            backgroundColor: isOver ? 'var(--expense)' : (color || 'var(--accent)'),
          }}
        />
      </div>
    </div>
  );
}
