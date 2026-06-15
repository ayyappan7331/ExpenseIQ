'use client';

import { useCategories } from '@/lib/hooks/useCategories';
import { useSubcategories } from '@/lib/hooks/useSubcategories';
import { usePaymentMethods } from '@/lib/hooks/usePaymentMethods';
import { usePaymentApps } from '@/lib/hooks/usePaymentApps';
import { useCreditCards } from '@/lib/hooks/queries';
import { useCreateTransactionWithCallback, useUpdateTransaction } from '../mutations';
import { useRecentValues, useRecentValuesForCategory } from '@/lib/hooks/useRecentValues';
import { useTransactionRowController } from './useTransactionRowController';
import { useState, useEffect, useRef } from 'react';
import {
  EditableCell,
  EditableSelectCell,
  EditableTextareaCell,
  EditableAmountCell,
  RowActionCell,
  createRowKeyboardHandlers,
  formatTransactionForSubmission,
  validateTransactionForm,
} from './primitives';
import { transactionsApi } from '@/lib/api/transactions';
import type { Transaction } from '@/lib/types/api';

interface Props {
  onClose: () => void;
  duplicateFrom?: Transaction;
  isEditMode?: boolean;
}

export function InlineTransactionRowEnhanced({ onClose, duplicateFrom, isEditMode = false }: Props) {
  const [isActive, setIsActive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const create = useCreateTransactionWithCallback();
  const update = useUpdateTransaction();

  // Track whether the form has been modified from its initial state
  const isDirtyRef = useRef(false);

  const { expenseCategories, incomeCategories } = useCategories();
  const { getFor } = useSubcategories();
  const { paymentMethods } = usePaymentMethods();
  const { paymentApps } = usePaymentApps();
  const { data: creditCards } = useCreditCards();

  // Set of payment method names that are linked to a credit card
  const ccMethods = new Set(
    (creditCards ?? []).map(c => (c.linkedPaymentMethod ?? c.name).toLowerCase())
  );
  const isCCMethod = (m?: string) => !!m && ccMethods.has(m.toLowerCase());
  // showCCWarning derived below after formData is available

  useEffect(() => {
    const timer = setTimeout(() => setIsActive(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const {
    formData,
    error,
    refs,
    updateField: updateFieldBase,
    handleCategoryChange: handleCategoryChangeBase,
    resetForm,
    handleSave,
    handleSaveAndAddAnother,
  } = useTransactionRowController({
    onClose,
    duplicateFrom,
    isEditMode,
    singlePaymentMethod: paymentMethods.length === 1 ? paymentMethods[0] : undefined,
    incomeCategories,
    onSave: (data) => {
      setIsSaving(true);
      if (isEditMode && duplicateFrom?.id) {
        update.mutate(
          { id: duplicateFrom.id, data },
          {
            onSuccess: () => { setSaveSuccess(true); setTimeout(() => onClose(), 300); },
            onError: () => setIsSaving(false),
          }
        );
      } else {
        create.mutate({
          data,
          onSuccess: () => { setSaveSuccess(true); setTimeout(() => onClose(), 300); },
        });
      }
    },
    onSaveAndAddAnother: (data) => {
      setIsSaving(true);
      create.mutate({
        data,
        onSuccess: () => {
          setSaveSuccess(true);
          setTimeout(() => { resetForm(); setSaveSuccess(false); setIsSaving(false); }, 300);
        },
      });
    },
  });

  // Wrap updateField/handleCategoryChange to mark dirty
  const updateField = (field: Parameters<typeof updateFieldBase>[0], value: string) => {
    isDirtyRef.current = true;
    updateFieldBase(field, value);
  };
  const handleCategoryChange = (category: string, getSubcategoriesFor: (cat: string) => string[]) => {
    isDirtyRef.current = true;
    handleCategoryChangeBase(category, getSubcategoriesFor);
  };

  // Warn when editing changes paymentMethod to/from a CC-linked method
  const originalPaymentMethod = duplicateFrom?.paymentMethod;
  const currentPaymentMethod  = formData.paymentMethod;
  const showCCWarning =
    isEditMode &&
    currentPaymentMethod !== originalPaymentMethod &&
    (isCCMethod(originalPaymentMethod) || isCCMethod(currentPaymentMethod));

  // Auto-save on unmount: if edit mode, dirty, and valid — fire update directly
  // Keep formDataRef in sync via effect so the cleanup closure reads latest values
  const formDataRef = useRef(formData);
  useEffect(() => {
    formDataRef.current = formData;
  });
  useEffect(() => {
    if (!isEditMode || !duplicateFrom?.id) return;
    return () => {
      if (!isDirtyRef.current) return;
      const data = formDataRef.current;
      const validation = validateTransactionForm(data);
      if (!validation.isValid) return;
      const payload = formatTransactionForSubmission(data, 'Personal');
      // Fire-and-forget: best-effort auto-save on unmount
      transactionsApi.update(duplicateFrom.id, payload).catch(() => {/* silent */});
    };
  }, [isEditMode, duplicateFrom?.id]);

  const recentValues = useRecentValues(3);
  const recentForCategory = useRecentValuesForCategory(formData.category || '', 2);
  void recentValues; void recentForCategory;

  const subcategories = formData.category ? getFor(formData.category) : [];

  const { dateRef, timeRef, categoryRef, subcategoryRef, notesRef, paymentRef, paymentAppRef, amountRef } = refs;

  // eslint-disable-next-line react-hooks/refs
  const keyboardHandlers = createRowKeyboardHandlers({
    dateRef,
    timeRef,
    categoryRef,
    subcategoryRef,
    notesRef,
    paymentRef,
    paymentAppRef,
    amountRef,
    onSave: handleSave,
    onSaveAndAddAnother: handleSaveAndAddAnother,
    onCancel: onClose,
  });

  const subcategoryOptions = subcategories.map(s => ({ value: s, label: s }));
  const paymentOptions = paymentMethods.map(m => ({ value: m, label: m }));
  const paymentAppOptions = paymentApps.map(a => ({ value: a, label: a }));

  // Grouped category select — Income / Expense optgroups
  const selectCls = 'w-full px-2 py-1 text-xs bg-bg-3 border border-card-border rounded-lg text-text focus:outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent transition-colors appearance-none';
  const selectErrCls = 'w-full px-2 py-1 text-xs bg-bg-3 border border-red-400 rounded-lg text-text focus:outline-none focus:ring-1 focus:ring-red-400/50 focus:border-red-400 transition-colors appearance-none';

  const rowClasses = [
    'border-b transition-all duration-300',
    saveSuccess
      ? 'bg-green-500/15 border-green-500/40 shadow-sm'
      : isActive
      ? 'bg-accent/10 shadow-sm'
      : 'bg-accent/5',
    isSaving ? 'opacity-70' : '',
    'hover:bg-accent/15',
  ].filter(Boolean).join(' ');

  return (
    <>
      <tr className={rowClasses}>
        {/* Indicator */}
        <td className="px-3 py-2 w-8">
          <div className={`w-4 h-4 rounded border transition-all duration-200 ${
            isActive ? 'border-accent bg-accent/20' : 'border-card-border bg-bg-3 opacity-50'
          }`} />
        </td>

      {/* Date */}
      <td className="px-2 py-2 whitespace-nowrap">
        <EditableCell
          ref={dateRef}
          type="date"
          value={formData.date}
          onChange={(value) => updateField('date', value)}
          onKeyDown={keyboardHandlers.handleDateKeyDown}
          aria-label="Date"
          disabled={isSaving}
        />
      </td>

      {/* Time */}
      <td className="px-2 py-2 whitespace-nowrap hidden xl:table-cell">
        <EditableCell
          ref={timeRef}
          type="time"
          value={formData.time || ''}
          onChange={(value) => updateField('time', value)}
          onKeyDown={keyboardHandlers.handleTimeKeyDown}
          aria-label="Time"
          disabled={isSaving}
        />
      </td>

      {/* Category — grouped by Income / Expense */}
      <td className="px-2 py-2">
        <div className="space-y-1">
          <select
            ref={categoryRef}
            value={formData.category || ''}
            onChange={(e) => handleCategoryChange(e.target.value, getFor)}
            onKeyDown={keyboardHandlers.handleCategoryKeyDown}
            className={`${!!error && !formData.category ? selectErrCls : selectCls} ${(expenseCategories.length === 0 && incomeCategories.length === 0) || isSaving ? 'opacity-40 cursor-not-allowed' : ''}`}
            disabled={(expenseCategories.length === 0 && incomeCategories.length === 0) || isSaving}
            aria-label="Category"
          >
            <option value="">Category *</option>
            {expenseCategories.length > 0 && (
              <>
                <option value="" disabled>── Expense ──</option>
                {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </>
            )}
            {incomeCategories.length > 0 && (
              <>
                <option value="" disabled>── Income ──</option>
                {incomeCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </>
            )}
          </select>
          {error && <span className="text-[10px] text-red-500">{error}</span>}
        </div>
      </td>

      {/* Subcategory */}
      <td className="px-2 py-2">
        <EditableSelectCell
          ref={subcategoryRef}
          value={formData.subcategory || ''}
          onChange={(value) => updateField('subcategory', value)}
          onKeyDown={keyboardHandlers.handleSubcategoryKeyDown}
          options={subcategoryOptions}
          placeholder={formData.category && subcategories.length === 0 ? 'No subcats' : 'Subcategory'}
          disabled={!formData.category || subcategories.length === 0 || isSaving}
        />
      </td>

      {/* Notes */}
      <td className="px-2 py-2 hidden md:table-cell max-w-[200px]">
        <EditableTextareaCell
          ref={notesRef}
          placeholder="Notes"
          value={formData.notes || ''}
          onChange={(value) => updateField('notes', value)}
          onKeyDown={keyboardHandlers.handleNotesKeyDown}
          rows={1}
          aria-label="Notes"
          disabled={isSaving}
        />
      </td>

      {/* Payment Method */}
      <td className="px-2 py-2 hidden lg:table-cell">
        <EditableSelectCell
          ref={paymentRef}
          value={formData.paymentMethod || ''}
          onChange={(value) => updateField('paymentMethod', value)}
          onKeyDown={keyboardHandlers.handlePaymentKeyDown}
          options={paymentOptions}
          placeholder={paymentMethods.length === 0 ? 'No methods' : 'Method'}
          aria-label="Payment method"
          disabled={paymentMethods.length === 0 || isSaving}
        />
      </td>

      {/* Payment App */}
      <td className="px-2 py-2 hidden xl:table-cell">
        <EditableSelectCell
          ref={paymentAppRef}
          value={formData.paymentApp || ''}
          onChange={(value) => updateField('paymentApp', value)}
          onKeyDown={keyboardHandlers.handlePaymentAppKeyDown}
          options={paymentAppOptions}
          placeholder={paymentApps.length === 0 ? 'No apps' : 'App'}
          aria-label="Payment app"
          disabled={paymentApps.length === 0 || isSaving}
        />
      </td>

      {/* Amount */}
      <td className="px-2 py-2 text-right whitespace-nowrap">
        <EditableAmountCell
          ref={amountRef}
          amount={formData.amount}
          type={formData.type}
          onAmountChange={(value) => updateField('amount', value)}
          onTypeChange={() => { /* type derived from category */ }}
          onKeyDown={keyboardHandlers.handleAmountKeyDown}
          aria-label="Amount"
          disabled={isSaving}
          hasError={!!error && (!formData.amount || Number(formData.amount) <= 0)}
        />
      </td>

      {/* Actions */}
      <td className="px-2 py-2 w-24">
        {saveSuccess ? (
          <div className="flex items-center justify-end gap-1 text-green-600">
            <span className="text-xs font-medium">Saved ✓</span>
          </div>
        ) : (
          <RowActionCell
            onSave={handleSave}
            onSaveAndAddAnother={handleSaveAndAddAnother}
            onCancel={onClose}
            isLoading={isSaving}
          />
        )}
      </td>
    </tr>

    {/* CC balance warning — shown when paymentMethod change affects a credit card */}
    {showCCWarning && (
      <tr>
        <td colSpan={10} className="px-4 py-1.5 bg-warning/8 border-b border-warning/20">
          <p className="text-[11px] text-warning font-medium">
            ⚠ Changing payment method to/from a credit card will affect the card&apos;s outstanding balance calculation.
          </p>
        </td>
      </tr>
    )}
    </>
  );
}
