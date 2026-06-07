'use client';

import { Plus, Trash2, Upload, Download, Tag, CreditCard, Layers, Zap, LayoutTemplate, Smartphone } from 'lucide-react';
import type { ViewMode, GroupPeriod } from './useDensityMode';
import { MAX_QUICK_ADD_ROWS } from './useMultiRowOrchestration';
import { SmartSimpleSwitch } from './SmartSimpleSwitch';

interface ToolbarActionsProps {
  selectedCount: number;
  hasCategories: boolean;
  showInlineRow: boolean;
  onBulkDelete: () => void;
  onManageCategories: () => void;
  onManageSubcategories: () => void;
  onManagePayments: () => void;
  onManagePaymentApps: () => void;
  onImport: () => void;
  onOpenExportCenter: () => void;
  onQuickAdd: () => void;
  onAdd: () => void;
  onOpenTemplates: () => void;
  density?: ViewMode;
  onSetDensity?: (mode: ViewMode) => void;
  groupPeriod?: GroupPeriod;
  onSetGroupPeriod?: (p: GroupPeriod) => void;
}

/**
 * Icon-only button that expands to show label on hover.
 * Width transitions from icon-only to icon+text over 220ms.
 */
function ToolbarIconButton({
  icon,
  label,
  onClick,
  disabled = false,
  title,
  variant = 'ghost' as const,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  variant?: 'ghost' | 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      aria-label={label}
      className={[
        'group relative flex items-center overflow-hidden rounded-lg border',
        'h-8 text-xs font-medium',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
        variant === 'danger'
          ? 'border-red-500/20 text-red-500 hover:bg-red-500/10 bg-transparent'
          : 'border-card-border text-text-2 hover:text-text hover:bg-bg-3 bg-transparent',
      ].join(' ')}
    >
      {/* Fixed-width icon zone — never shifts */}
      <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
        {icon}
      </span>

      {/* Label — zero-width by default, expands on hover without moving icon */}
      <span
        className="overflow-hidden whitespace-nowrap transition-all duration-[220ms] ease-in-out max-w-0 group-hover:max-w-[100px] pr-0 group-hover:pr-2"
      >
        {label}
      </span>
    </button>
  );
}

export function ToolbarActions({
  selectedCount,
  hasCategories,
  showInlineRow,
  onBulkDelete,
  onManageCategories,
  onManageSubcategories,
  onManagePayments,
  onManagePaymentApps,
  onImport,
  onOpenExportCenter,
  onQuickAdd,
  onAdd,
  onOpenTemplates,
  density,
  onSetDensity,
  groupPeriod,
  onSetGroupPeriod,
}: ToolbarActionsProps) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {selectedCount > 0 && (
        <ToolbarIconButton
          icon={<Trash2 className="w-3.5 h-3.5" />}
          label={`Delete (${selectedCount})`}
          onClick={onBulkDelete}
          variant="danger"
        />
      )}

      <ToolbarIconButton
        icon={<LayoutTemplate className="w-3.5 h-3.5" />}
        label="Templates"
        onClick={onOpenTemplates}
      />
      <ToolbarIconButton
        icon={<Tag className="w-3.5 h-3.5" />}
        label="Categories"
        onClick={onManageCategories}
      />
      <ToolbarIconButton
        icon={<Layers className="w-3.5 h-3.5" />}
        label="Subcategories"
        onClick={onManageSubcategories}
      />
      <ToolbarIconButton
        icon={<CreditCard className="w-3.5 h-3.5" />}
        label="Payments"
        onClick={onManagePayments}
      />
      <ToolbarIconButton
        icon={<Smartphone className="w-3.5 h-3.5" />}
        label="Pay Apps"
        onClick={onManagePaymentApps}
      />
      <ToolbarIconButton
        icon={<Upload className="w-3.5 h-3.5" />}
        label="Import"
        onClick={onImport}
      />
      <ToolbarIconButton
        icon={<Download className="w-3.5 h-3.5" />}
        label="Export"
        onClick={onOpenExportCenter}
      />

      {onSetDensity && density !== undefined && (
        <SmartSimpleSwitch
          value={density}
          onChange={onSetDensity}
          groupPeriod={groupPeriod}
          onGroupPeriodChange={onSetGroupPeriod}
        />
      )}

      <ToolbarIconButton
        icon={<Zap className="w-3.5 h-3.5" />}
        label="Quick Add"
        onClick={onQuickAdd}
        disabled={showInlineRow || !hasCategories}
        title={
          showInlineRow
            ? `Maximum ${MAX_QUICK_ADD_ROWS} rows reached`
            : hasCategories
            ? 'Quick Add (N)'
            : 'Add categories first'
        }
      />

      {/* Add button — icon-only by default, expands to show label on hover */}
      <button
        type="button"
        onClick={onAdd}
        disabled={!hasCategories}
        title={hasCategories ? 'Add transaction' : 'Add categories first'}
        aria-label="Add transaction"
        className={[
          'group relative flex items-center overflow-hidden rounded-lg border',
          'h-8 text-xs font-medium',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
          !hasCategories ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
          'border-accent bg-accent text-white hover:bg-accent/90',
        ].join(' ')}
      >
        <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
          <Plus className="w-3.5 h-3.5" />
        </span>
        <span className="overflow-hidden whitespace-nowrap transition-all duration-[220ms] ease-in-out max-w-0 group-hover:max-w-[60px] pr-0 group-hover:pr-2">
          Add
        </span>
      </button>
    </div>
  );
}
