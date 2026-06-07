'use client';

import { useState, useEffect } from 'react';
import { Modal, Button } from '@/components/ui';
import { useCategories } from '@/lib/hooks/useCategories';
import { usePaymentMethods } from '@/lib/hooks/usePaymentMethods';
import { useBulkUpdateTransactions } from '../mutations';
import type { Transaction } from '@/lib/types/api';

interface BulkEditModalProps {
  open: boolean;
  onClose: () => void;
  selectedTransactions: Transaction[];
  onSuccess?: () => void;
}

interface BulkEditData {
  category?: string;
  subcategory?: string;
  paymentMethod?: string;
  type?: 'income' | 'expense';
}

export function BulkEditModal({ open, onClose, selectedTransactions, onSuccess }: BulkEditModalProps) {
  const [editData, setEditData] = useState<BulkEditData>({});
  const [isOptimistic, setIsOptimistic] = useState(false);
  const { expenseCategories, incomeCategories } = useCategories();
  const { paymentMethods } = usePaymentMethods();
  const bulkUpdate = useBulkUpdateTransactions();

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      // Use a timeout to avoid setState during render
      const timer = setTimeout(() => {
        setEditData({});
        setIsOptimistic(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleSave = () => {
    if (Object.keys(editData).length === 0) {
      onClose();
      return;
    }

    setIsOptimistic(true);
    const updates = selectedTransactions.map(txn => ({
      id: txn.id,
      ...editData,
    }));

    bulkUpdate.mutate(updates, {
      onSuccess: () => {
        // Small delay to show success state
        setTimeout(() => {
          onSuccess?.();
          onClose();
          setEditData({});
          setIsOptimistic(false);
        }, 300);
      },
      onError: () => {
        setIsOptimistic(false);
      },
    });
  };

  const handleClose = () => {
    if (bulkUpdate.isPending) return; // Prevent closing during update
    onClose();
    setEditData({});
    setIsOptimistic(false);
  };

  const handleReset = () => {
    setEditData({});
  };

  const allCategories = [...expenseCategories, ...incomeCategories];
  const hasChanges = Object.keys(editData).length > 0;
  const isLoading = bulkUpdate.isPending;
  const showSuccess = isOptimistic && !isLoading;

  return (
    <Modal 
      open={open} 
      onClose={handleClose} 
      title={`Bulk Edit ${selectedTransactions.length} Transactions`}
      size="md"
    >
      <div className="space-y-4">
        {/* Loading/Success State */}
        {isLoading && (
          <div className="p-4 bg-accent/10 rounded-lg border border-accent/20 text-center">
            <div className="flex items-center justify-center gap-2 text-accent">
              <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              <span className="text-sm font-medium">Updating {selectedTransactions.length} transactions...</span>
            </div>
          </div>
        )}

        {showSuccess && (
          <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20 text-center">
            <div className="flex items-center justify-center gap-2 text-green-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">Successfully updated {selectedTransactions.length} transactions!</span>
            </div>
          </div>
        )}

        {!isLoading && !showSuccess && (
          <>
            <p className="text-sm text-text-2">
              Select the fields you want to update. Only selected fields will be changed.
            </p>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Transaction Type
              </label>
              <select
                value={editData.type || ''}
                onChange={(e) => setEditData(prev => ({ 
                  ...prev, 
                  type: e.target.value as 'income' | 'expense' | undefined,
                  // Clear category if switching type
                  category: e.target.value !== prev.type ? undefined : prev.category,
                  subcategory: e.target.value !== prev.type ? undefined : prev.subcategory,
                }))}
                className="w-full px-3 py-2 text-sm bg-bg-2 border border-card-border rounded-xl text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                <option value="">Keep current type</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Category
              </label>
              <select
                value={editData.category || ''}
                onChange={(e) => setEditData(prev => ({ 
                  ...prev, 
                  category: e.target.value || undefined,
                  // Clear subcategory when category changes
                  subcategory: e.target.value !== prev.category ? undefined : prev.subcategory,
                }))}
                className="w-full px-3 py-2 text-sm bg-bg-2 border border-card-border rounded-xl text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                <option value="">Keep current category</option>
                {allCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Payment Method
              </label>
              <select
                value={editData.paymentMethod || ''}
                onChange={(e) => setEditData(prev => ({ 
                  ...prev, 
                  paymentMethod: e.target.value || undefined 
                }))}
                className="w-full px-3 py-2 text-sm bg-bg-2 border border-card-border rounded-xl text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                <option value="">Keep current payment method</option>
                {paymentMethods.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>

            {/* Summary */}
            {hasChanges && (
              <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
                <p className="text-sm font-medium text-accent mb-1">Changes to apply:</p>
                <ul className="text-xs text-accent space-y-0.5">
                  {editData.type && <li>• Type: {editData.type}</li>}
                  {editData.category && <li>• Category: {editData.category}</li>}
                  {editData.paymentMethod && <li>• Payment Method: {editData.paymentMethod}</li>}
                </ul>
              </div>
            )}
          </>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          {hasChanges && !isLoading && !showSuccess && (
            <Button variant="ghost" size="sm" onClick={handleReset}>
              Reset
            </Button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <Button 
              variant="ghost" 
              onClick={handleClose}
              disabled={isLoading}
            >
              {showSuccess ? 'Done' : 'Cancel'}
            </Button>
            {!showSuccess && (
              <Button 
                onClick={handleSave} 
                disabled={!hasChanges || isLoading}
                loading={isLoading}
              >
                Update {selectedTransactions.length} Transaction{selectedTransactions.length > 1 ? 's' : ''}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}