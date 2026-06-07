'use client';

import type { TransactionSubtype } from '@/lib/types/api';

export interface ValidationResult {
  isValid: boolean;
  error: string;
}

export interface TransactionFormData {
  amount: string;
  category: string;
  date: string;
  time: string;
  type: 'expense' | 'income';
  subtype?: TransactionSubtype;
  subcategory?: string;
  paymentMethod?: string;
  paymentApp?: string;
  notes?: string;
}

export function validateTransactionForm(data: TransactionFormData): ValidationResult {
  if (!data.amount || Number(data.amount) <= 0) {
    return { isValid: false, error: 'Amount required' };
  }
  if (!data.category) {
    return { isValid: false, error: 'Category required' };
  }
  if (!data.date) {
    return { isValid: false, error: 'Date required' };
  }
  return { isValid: true, error: '' };
}

export function resetTransactionForm(): TransactionFormData {
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const now = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return {
    type: 'expense',
    subtype: undefined,
    amount: '',
    category: '',
    subcategory: '',
    date: today,
    time: now,
    paymentMethod: '',
    paymentApp: '',
    notes: '',
  };
}

export function formatTransactionForSubmission(data: TransactionFormData, profileId: string) {
  return {
    profileId,
    type: data.type,
    subtype: data.subtype || undefined,
    amount: Number(data.amount),
    category: data.category,
    subcategory: data.subcategory || undefined,
    date: data.date,
    time: data.time || undefined,
    paymentMethod: data.paymentMethod || undefined,
    paymentApp: data.paymentApp || undefined,
    notes: data.notes || undefined,
  };
}
