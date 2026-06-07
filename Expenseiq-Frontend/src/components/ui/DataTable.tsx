'use client';

import { type ReactNode } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render: (row: T) => ReactNode;
  className?: string;
}

export interface SortState {
  key: string;
  dir: 'asc' | 'desc';
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  sort?: SortState;
  onSort?: (key: string) => void;
  emptyMessage?: string;
  emptyEmoji?: string;
  className?: string;
  onRowClick?: (row: T) => void;
  selectedKeys?: Set<string>;
  onSelectRow?: (key: string) => void;
  onSelectAll?: () => void;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  sort,
  onSort,
  emptyMessage = 'No data',
  emptyEmoji,
  className = '',
  onRowClick,
  selectedKeys,
  onSelectRow,
  onSelectAll,
}: DataTableProps<T>) {
  const showSelect = !!onSelectRow;

  if (data.length === 0) {
    return <EmptyState emoji={emptyEmoji} message={emptyMessage} />;
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-card-border">
            {showSelect && (
              <th className="px-3 py-2.5 w-8">
                <input
                  type="checkbox"
                  checked={selectedKeys?.size === data.length}
                  onChange={onSelectAll}
                  className="rounded border-card-border"
                  aria-label="Select all"
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-2.5 text-left text-xs font-medium text-text-3 uppercase tracking-wider ${col.sortable ? 'cursor-pointer select-none hover:text-text-2' : ''} ${col.className || ''}`}
                onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && sort?.key === col.key && (
                    sort.dir === 'asc'
                      ? <ChevronUp className="w-3 h-3" />
                      : <ChevronDown className="w-3 h-3" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const key = keyExtractor(row);
            return (
              <tr
                key={key}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-card-border/50 transition-colors ${onRowClick ? 'cursor-pointer hover:bg-bg-3' : ''} ${selectedKeys?.has(key) ? 'bg-accent/5' : ''}`}
              >
                {showSelect && (
                  <td className="px-3 py-2.5 w-8">
                    <input
                      type="checkbox"
                      checked={selectedKeys?.has(key)}
                      onChange={() => onSelectRow?.(key)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-card-border"
                      aria-label={`Select row ${key}`}
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className={`px-3 py-2.5 text-text ${col.className || ''}`}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
