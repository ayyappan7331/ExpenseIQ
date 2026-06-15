'use client';

import { Fragment, useMemo, useState } from 'react';
import { Pencil, Trash2, ChevronUp, ChevronDown, ChevronRight, ChevronLeft, LayoutTemplate } from 'lucide-react';
import { Button, type SortState } from '@/components/ui';
import { formatCurrency } from '@/components/charts';
import { dateLabel, timeLabel, groupByDate, groupByPeriod, type TransactionGroup } from '@/lib/utils/dates';
import type { Transaction } from '@/lib/types/api';
import type { ViewMode, GroupPeriod } from './useDensityMode';
import { useGroupCollapse } from './useGroupCollapse';
import { InlineTransactionRowEnhanced } from './InlineTransactionRowEnhanced';
import type { QuickAddRow } from './useMultiRowOrchestration';
import { lsGetOne, lsSetOne, lsProfileKey } from '@/lib/utils/localStorage';

function SortIcon({ sortKey, col, dir }: { sortKey: string; col: string; dir: string }) {
  if (sortKey !== col) return null;
  return dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
}

/** Glossy circular checkbox — replaces native <input type="checkbox"> */
function GlossyCheckbox({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      className="relative flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-1 rounded-[5px]"
      style={{ width: 18, height: 18 }}
    >
      {/* Track */}
      <span
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '5px',
          border: checked ? '2px solid var(--accent)' : '2px solid var(--card-border)',
          background: checked
            ? 'linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 70%, #fff) 100%)'
            : 'var(--bg-2)',
          boxShadow: checked
            ? '0 2px 8px -2px var(--accent), inset 0 1px 0 rgba(255,255,255,0.25)'
            : 'inset 0 1px 2px rgba(0,0,0,0.15)',
          transition: 'background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
        }}
      />
      {/* Checkmark — drawn via SVG, animates in */}
      <svg
        viewBox="0 0 12 12"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          padding: '3px',
          opacity: checked ? 1 : 0,
          transform: checked ? 'scale(1)' : 'scale(0.5)',
          transition: 'opacity 0.18s ease, transform 0.18s cubic-bezier(0.34,1.56,0.64,1)',
        }}
        aria-hidden
      >
        <polyline
          points="1.5,6 4.5,9.5 10.5,2"
          fill="none"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 200];
const PAGE_SIZE_KEY = 'expenseiq_page_size';
function pageSizeKey() { return lsProfileKey(PAGE_SIZE_KEY, 'Personal'); }

interface Props {
  transactions: Transaction[];
  sort: SortState;
  onSort: (key: string) => void;
  selectedKeys: Set<string>;
  onSelectRow: (key: string) => void;
  onSelectAll: () => void;
  onDelete: (txn: Transaction) => void;
  onSaveAsTemplate?: (txn: Transaction) => void;
  density?: ViewMode;
  groupPeriod?: GroupPeriod;
  grouped?: boolean;
  quickAddRows?: QuickAddRow[];
  onRemoveQuickAddRow?: (id: string) => void;
}

export function TransactionTable({
  transactions,
  sort,
  onSort,
  selectedKeys,
  onSelectRow,
  onSelectAll,
  onDelete,
  onSaveAsTemplate,
  density = 'grouped',
  groupPeriod = 'day',
  grouped = true,
  quickAddRows = [],
  onRemoveQuickAddRow,
}: Props) {
  const cell = 'px-2 py-2';
  const effectiveGrouped = grouped && density !== 'flat';
  const { isCollapsed, toggle } = useGroupCollapse();

  // Pagination state.
  // We co-locate page with the transactions identity it belongs to so that
  // when a new transactions array arrives (filter changed), we can derive
  // page = 1 in the same render without useEffect or ref access.
  const [pageSize, setPageSizeState] = useState<number>(
    () => lsGetOne<number>(pageSizeKey()) ?? 20
  );
  const [pageState, setPageState] = useState<{ page: number; forTxns: Transaction[] }>(
    () => ({ page: 1, forTxns: transactions })
  );
  // If the transactions prop changed since we last set page, show page 1.
  const page = pageState.forTxns === transactions ? pageState.page : 1;

  function setPage(n: number | ((p: number) => number)) {
    setPageState(prev => ({
      page: typeof n === 'function' ? n(prev.page) : n,
      forTxns: transactions,
    }));
  }

  function setPageSize(n: number) {
    setPageSizeState(n);
    lsSetOne(pageSizeKey(), n);
    setPage(1);
  }

  // Inline editing state — Set allows multiple rows open simultaneously
  const [editingIds, setEditingIds] = useState<Set<string>>(new Set());

  function startInlineEdit(txn: Transaction) {
    setEditingIds(prev => new Set(prev).add(txn.id));
  }
  function cancelInlineEdit(id: string) {
    setEditingIds(prev => { const next = new Set(prev); next.delete(id); return next; });
  }

  // Smart mode: paginate transactions first, then group the page slice.
  // Simple mode: paginate rows directly.
  // This ensures pageSize always means "N transactions per page" in both modes.
  const totalCount = transactions.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageSlice = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return transactions.slice(start, start + pageSize);
  }, [transactions, safePage, pageSize]);

  const groups = useMemo(() => {
    if (!effectiveGrouped) return null;
    if (groupPeriod === 'day') return groupByDate(pageSlice) as { label: string; items: Transaction[] }[];
    return groupByPeriod(pageSlice, groupPeriod);
  }, [pageSlice, effectiveGrouped, groupPeriod]);

  const paginated = useMemo(() => {
    if (effectiveGrouped) return [];
    return pageSlice;
  }, [effectiveGrouped, pageSlice]);

const hasQuickAddRows = quickAddRows.length > 0;

  if (transactions.length === 0 && !hasQuickAddRows) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <span className="text-4xl mb-3">🔍</span>
        <p className="text-text-2 text-sm">No transactions match your filters</p>
      </div>
    );
  }

  const thClass = `${cell} text-center text-xs font-bold text-text uppercase tracking-wider cursor-pointer select-none hover:text-accent whitespace-nowrap`;
  const thStaticClass = `${cell} text-center text-xs font-bold text-text uppercase tracking-wider whitespace-nowrap`;
  const TOTAL_COLS = 10;

  const renderRow = (transaction: Transaction) => {
    const key = transaction.id;
    const isSelected = selectedKeys?.has(key) ?? false;
    const isEditing = editingIds.has(key);

    if (isEditing) {
      return (
        <InlineTransactionRowEnhanced
          key={`edit-${key}`}
          onClose={() => cancelInlineEdit(key)}
          duplicateFrom={transaction}
          isEditMode
        />
      );
    }

    return (
      <tr
        key={key}
        className={[
          'border-b transition-colors duration-100 group',
          'border-card-border/50 hover:bg-bg-3',
          isSelected ? '!bg-accent/8' : '',
        ].filter(Boolean).join(' ')}
      >
        <td className={`${cell} w-8`}>
          <div className="flex items-center justify-center">
            <GlossyCheckbox
              checked={isSelected}
              onChange={() => onSelectRow?.(key)}
              ariaLabel={`Select transaction ${key}`}
            />
          </div>
        </td>
        <td className={`${cell} whitespace-nowrap text-center`}>
          <span className="text-xs text-text-2">{dateLabel(transaction.date)}</span>
        </td>
        <td className={`${cell} whitespace-nowrap hidden xl:table-cell text-center`}>
          <span className="text-xs text-text-2">
            {transaction.time ? timeLabel(transaction.time) : <span className="text-text-3">—</span>}
          </span>
        </td>
        <td className={`${cell} text-center`}>
          <span className="text-xs text-text-2 font-semibold">{transaction.category || transaction.source || '—'}</span>
        </td>
        <td className={`${cell} text-center`}>
          <span className="text-xs text-text-2">{transaction.subcategory || <span className="text-text-3">—</span>}</span>
        </td>
        <td className={`${cell} hidden md:table-cell max-w-[180px] text-center`}>
          <span className="text-xs text-text-2 truncate block" title={transaction.notes || undefined}>
            {transaction.notes ? (transaction.notes).split('\n')[0] : <span className="text-text-3">—</span>}
          </span>
        </td>
        <td className={`${cell} hidden lg:table-cell text-center`}>
          <span className="text-xs text-text-2">{transaction.paymentMethod || <span className="text-text-3">—</span>}</span>
        </td>
        <td className={`${cell} hidden xl:table-cell text-center`}>
          <span className="text-xs text-text-2">{transaction.paymentApp || <span className="text-text-3">—</span>}</span>
        </td>
        <td className={`${cell} text-center whitespace-nowrap`}>
          <span className={`text-xs font-semibold ${transaction.type === 'income' ? 'text-income' : 'text-expense'}`}>
            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
          </span>
        </td>
        <td className={`${cell} w-24`}>
          <div className="flex items-center gap-0 justify-center sm:opacity-60 sm:group-hover:opacity-100 transition-opacity">
            <Button variant="icon" size="sm" onClick={() => startInlineEdit(transaction)}
              aria-label="Edit" title="Edit transaction" className="min-w-[28px] min-h-[28px]">
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            {onSaveAsTemplate && (
              <Button variant="icon" size="sm" onClick={() => onSaveAsTemplate(transaction)}
                aria-label="Save as Template" title="Save as Template" className="min-w-[28px] min-h-[28px]">
                <LayoutTemplate className="w-3.5 h-3.5 text-text-3 hover:text-accent" />
              </Button>
            )}
            <Button variant="icon" size="sm" onClick={() => onDelete(transaction)}
              aria-label="Delete" className="min-w-[28px] min-h-[28px]">
              <Trash2 className="w-3.5 h-3.5 text-expense" />
            </Button>
          </div>
        </td>
      </tr>
    );
  };

  const renderGroupHeader = (label: string, count: number, items: Transaction[]) => {
    const income = items.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = items.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const net = income - expense;
    return (
      <tr className="bg-bg-2 border-y border-card-border/40 cursor-pointer select-none hover:bg-bg-3 transition-colors duration-100"
        onClick={() => toggle(label as TransactionGroup)}>
        <td colSpan={TOTAL_COLS} className={`${cell} min-h-[36px]`}>
          <div className="flex items-center justify-between gap-4">
            {/* Left: collapse icon + label + count */}
            <div className="flex items-center gap-2">
              <span className="text-text-3 inline-flex flex-shrink-0">
                {isCollapsed(label as TransactionGroup)
                  ? <ChevronRight className="w-3.5 h-3.5" />
                  : <ChevronDown className="w-3.5 h-3.5" />}
              </span>
              <span className="text-xs font-semibold text-text-2 uppercase tracking-wider">{label}</span>
              <span className="text-[11px] text-text-3">{count} transaction{count !== 1 ? 's' : ''}</span>
            </div>
            {/* Right: income / expense / net summary */}
            <div className="flex items-center gap-4 text-[11px] italic flex-shrink-0">
              <span className="text-income">
                Income +{formatCurrency(income)}
              </span>
              <span className="text-expense">
                Expense -{formatCurrency(expense)}
              </span>
              <span className={`font-medium ${net >= 0 ? 'text-income' : 'text-expense'}`}>
                Net {net >= 0 ? '+' : ''}{formatCurrency(net)}
              </span>
            </div>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-card-border">
              <th className={`${cell} w-8`}>
                <div className="flex items-center justify-center">
                  <GlossyCheckbox
                    checked={selectedKeys?.size === transactions.length && transactions.length > 0}
                    onChange={onSelectAll}
                    ariaLabel="Select all"
                  />
                </div>
              </th>
              <th className={thClass} onClick={() => onSort('date')}>
                <span className="inline-flex items-center justify-center gap-1">Date <SortIcon sortKey={sort?.key} col="date" dir={sort?.dir} /></span>
              </th>
              <th className={`${thStaticClass} hidden xl:table-cell`}>Time</th>
              <th className={thClass} onClick={() => onSort('category')}>
                <span className="inline-flex items-center justify-center gap-1">Category <SortIcon sortKey={sort?.key} col="category" dir={sort?.dir} /></span>
              </th>
              <th className={`${cell} text-center text-xs font-bold text-text uppercase tracking-wider`}>Subcategory</th>
              <th className={`${cell} text-center text-xs font-bold text-text uppercase tracking-wider hidden md:table-cell`}>Notes</th>
              <th className={`${cell} text-center text-xs font-bold text-text uppercase tracking-wider hidden lg:table-cell`}>Method</th>
              <th className={`${cell} text-center text-xs font-bold text-text uppercase tracking-wider hidden xl:table-cell`}>App</th>
              <th className={thClass} onClick={() => onSort('amount')}>
                <span className="inline-flex items-center justify-center gap-1 w-full">Amount <SortIcon sortKey={sort?.key} col="amount" dir={sort?.dir} /></span>
              </th>
              <th className={`${cell} text-center text-xs font-bold text-text uppercase tracking-wider w-24`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Quick-add rows */}
            {quickAddRows.map(row => (
              <InlineTransactionRowEnhanced
                key={row.id}
                onClose={() => onRemoveQuickAddRow?.(row.id)}
                duplicateFrom={row.duplicateFrom}
              />
            ))}

            {/* Grouped or flat rows */}
            {groups
              ? groups.map(({ label, items }) => (
                  <Fragment key={`group-${label}`}>
                    {renderGroupHeader(label, items.length, items)}
                    {!isCollapsed(label as TransactionGroup) && items.map(renderRow)}
                  </Fragment>
                ))
              : paginated.map(renderRow)
            }
          </tbody>
        </table>

        {/* Pagination bar — inside min-w wrapper so it scrolls with the table */}
        {totalCount > 0 && (
          <div className="flex items-center justify-between gap-4 px-3 py-2 border-t border-card-border/50 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-text-3">
              <span>{effectiveGrouped ? 'Rows per page:' : 'Rows per page:'}</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1 text-xs bg-bg-2 border border-card-border rounded-lg text-text focus:outline-none focus:ring-1 focus:ring-accent/40"
              >
                {PAGE_SIZE_OPTIONS.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="text-text-3">
                {`${(safePage - 1) * pageSize + 1}\u2013${Math.min(safePage * pageSize, totalCount)} of ${totalCount}`}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Button variant="icon" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1} aria-label="Previous page">
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p: number;
                if (totalPages <= 5) {
                  p = i + 1;
                } else if (safePage <= 3) {
                  p = i + 1;
                } else if (safePage >= totalPages - 2) {
                  p = totalPages - 4 + i;
                } else {
                  p = safePage - 2 + i;
                }
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={[
                      'w-7 h-7 text-xs rounded-lg transition-colors',
                      p === safePage
                        ? 'bg-accent text-white font-medium'
                        : 'text-text-2 hover:bg-bg-3',
                    ].join(' ')}
                  >
                    {p}
                  </button>
                );
              })}

              <Button variant="icon" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages} aria-label="Next page">
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
