'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useKeyboardNavigation } from '@/lib/hooks/useKeyboardNavigation';
import {
  validateTransactionForm,
  resetTransactionForm,
  formatTransactionForSubmission,
  type TransactionFormData,
} from './primitives';
import type { Transaction, NewTransaction } from '@/lib/types/api';

interface UseTransactionRowControllerProps {
  onClose: () => void;
  duplicateFrom?: Transaction;
  isEditMode?: boolean;
  onSave?: (data: NewTransaction) => void;
  onSaveAndAddAnother?: (data: NewTransaction) => void;
  singlePaymentMethod?: string;
  incomeCategories?: string[];
}

function localNow(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useTransactionRowController({
  onClose,
  duplicateFrom,
  isEditMode = false,
  onSave,
  onSaveAndAddAnother,
  singlePaymentMethod,
  incomeCategories = [],
}: UseTransactionRowControllerProps) {
  const initialData: TransactionFormData = duplicateFrom
    ? {
        type: duplicateFrom.type as 'expense' | 'income',
        amount: String(duplicateFrom.amount || ''),
        category: duplicateFrom.category || '',
        subcategory: duplicateFrom.subcategory || '',
        date: isEditMode ? duplicateFrom.date : localToday(),
        // Edit mode: keep original time. Duplicate: use current time.
        time: isEditMode ? (duplicateFrom.time || '') : localNow(),
        paymentMethod: duplicateFrom.paymentMethod || '',
        paymentApp: duplicateFrom.paymentApp || '',
        notes: duplicateFrom.notes || '',
      }
    : {
        ...resetTransactionForm(),
        paymentMethod: singlePaymentMethod ?? '',
      };

  const [formData, setFormData] = useState<TransactionFormData>(initialData);
  const [error, setError] = useState('');

  const dateRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const subcategoryRef = useRef<HTMLSelectElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const paymentRef = useRef<HTMLSelectElement>(null);
  const paymentAppRef = useRef<HTMLSelectElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (duplicateFrom) {
      dateRef.current?.focus();
    } else {
      amountRef.current?.focus();
    }
  }, [duplicateFrom]);

  const updateField = (field: keyof TransactionFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleCategoryChange = (category: string, getSubcategoriesFor: (cat: string) => string[]) => {
    // Derive type from which list the category belongs to
    const derivedType: 'expense' | 'income' =
      incomeCategories.includes(category) ? 'income' : 'expense';
    const subcategories = getSubcategoriesFor(category);
    setFormData(prev => ({
      ...prev,
      category,
      type: derivedType,
      subcategory: subcategories.includes(prev.subcategory || '') ? (prev.subcategory || '') : '',
    }));
    if (error) setError('');
  };

  const resetForm = useCallback(() => {
    setFormData({ ...resetTransactionForm(), paymentMethod: singlePaymentMethod ?? '' });
    setError('');
    setTimeout(() => amountRef.current?.focus(), 0);
  }, [singlePaymentMethod]);

  const handleSave = useCallback(() => {
    const validation = validateTransactionForm(formData);
    if (!validation.isValid) { setError(validation.error); return; }
    onSave?.(formatTransactionForSubmission(formData, 'Personal'));
  }, [formData, onSave]);

  const handleSaveAndAddAnother = useCallback(() => {
    const validation = validateTransactionForm(formData);
    if (!validation.isValid) { setError(validation.error); return; }
    onSaveAndAddAnother?.(formatTransactionForSubmission(formData, 'Personal'));
  }, [formData, onSaveAndAddAnother]);

  useKeyboardNavigation({ onEscape: onClose, onEnter: handleSave, enabled: true });

  return {
    formData,
    error,
    refs: { dateRef, timeRef, categoryRef, subcategoryRef, notesRef, paymentRef, paymentAppRef, amountRef },
    updateField,
    handleCategoryChange,
    resetForm,
    handleSave,
    handleSaveAndAddAnother,
    onClose,
  };
}
