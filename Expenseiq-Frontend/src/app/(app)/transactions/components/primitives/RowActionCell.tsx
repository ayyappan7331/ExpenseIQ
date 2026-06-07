'use client';

import { Check, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui';

interface RowActionCellProps {
  onSave: () => void;
  onSaveAndAddAnother?: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function RowActionCell({
  onSave,
  onSaveAndAddAnother,
  onCancel,
  isLoading = false,
  disabled = false,
}: RowActionCellProps) {
  const btnCls = 'min-w-[32px] min-h-[32px] transition-transform hover:scale-110 active:scale-95 touch-manipulation';

  return (
    <div className="flex items-center gap-1 justify-end">
      {onSaveAndAddAnother && (
        <Button
          variant="icon"
          size="sm"
          onClick={onSaveAndAddAnother}
          loading={isLoading}
          disabled={disabled}
          aria-label="Save and add another"
          title="Save & Add Another (Ctrl+Enter)"
          className={btnCls}
        >
          <Plus className="w-3.5 h-3.5 text-accent" />
        </Button>
      )}
      <Button
        variant="icon"
        size="sm"
        onClick={onSave}
        loading={isLoading}
        disabled={disabled}
        aria-label="Save transaction"
        title="Save (Enter)"
        className={btnCls}
      >
        <Check className="w-3.5 h-3.5 text-income" />
      </Button>
      <Button
        variant="icon"
        size="sm"
        onClick={onCancel}
        disabled={isLoading}
        aria-label="Cancel"
        title="Cancel (Escape)"
        className={btnCls}
      >
        <X className="w-3.5 h-3.5 text-expense" />
      </Button>
    </div>
  );
}
