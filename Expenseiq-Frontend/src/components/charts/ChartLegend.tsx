// Custom chart legend — renders outside the canvas for better control.
// Matches the legacy inline legend style used alongside doughnut charts.

export interface LegendItem {
  label: string;
  color: string;
  value?: string;
}

export interface ChartLegendProps {
  items: LegendItem[];
  className?: string;
  columns?: 1 | 2 | 3;
}

const colsMap = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3' };

export function ChartLegend({ items, className = '', columns = 2 }: ChartLegendProps) {
  if (items.length === 0) return null;

  return (
    <div className={`grid ${colsMap[columns]} gap-x-4 gap-y-2 ${className}`}>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: item.color }}
            aria-hidden="true"
          />
          <span className="text-xs text-text-2 truncate">{item.label}</span>
          {item.value && (
            <span className="text-xs font-medium text-text ml-auto shrink-0">{item.value}</span>
          )}
        </div>
      ))}
    </div>
  );
}
