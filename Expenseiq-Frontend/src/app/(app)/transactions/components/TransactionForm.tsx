'use client';

import { useState } from 'react';
import { Button, Input, Select, Textarea } from '@/components/ui';
import { useCategories } from '@/lib/hooks/useCategories';
import { usePaymentMethods } from '@/lib/hooks/usePaymentMethods';
import { usePaymentApps } from '@/lib/hooks/usePaymentApps';
import { useSubcategories } from '@/lib/hooks/useSubcategories';
import type { NewTransaction, Transaction, TransactionSubtype } from '@/lib/types/api';
import { INCOME_SUBTYPES, EXPENSE_SUBTYPES } from '@/lib/types/api';

interface Props {
  initial?: Transaction;
  onSubmit: (data: NewTransaction) => void;
  onCancel: () => void;
  loading?: boolean;
}

function localNow(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function TransactionForm({ initial, onSubmit, onCancel, loading }: Props) {
  const [type, setType] = useState<'income' | 'expense'>(initial?.type || 'expense');
  const [subtype, setSubtype] = useState<TransactionSubtype | ''>(initial?.subtype || '');
  const [amount, setAmount] = useState(initial?.amount?.toString() || '');
  const [category, setCategory] = useState(initial?.category || '');
  const [subcategory, setSubcategory] = useState(initial?.subcategory || '');
  const [date, setDate] = useState(initial?.date || localToday());
  const [time, setTime] = useState(initial?.time || localNow());
  const [paymentMethod, setPaymentMethod] = useState(initial?.paymentMethod || '');
  const [paymentApp, setPaymentApp] = useState(initial?.paymentApp || '');
  const [notes, setNotes] = useState(initial?.notes || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { expenseCategories, incomeCategories } = useCategories();
  const { paymentMethods } = usePaymentMethods();
  const { paymentApps } = usePaymentApps();
  const { getFor } = useSubcategories();

  const subcategories = category ? getFor(category) : [];

  function handleCategoryChange(val: string) {
    setCategory(val);
    // Derive type from which group the category belongs to.
    // If the category doesn't match either list (e.g. it was deleted from
    // FinancialConfig after the form was opened), default to 'expense' so
    // the subtype dropdown never shows stale options for the wrong type.
    if (incomeCategories.includes(val)) {
      setType('income');
    } else {
      // Covers both expense categories AND unknown/blank categories
      setType('expense');
    }
    // Reset subtype whenever type may have changed
    setSubtype('');
    const subs = getFor(val);
    if (!subs.includes(subcategory)) setSubcategory('');
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!amount || Number(amount) <= 0) e.amount = 'Amount must be greater than 0';
    if (!category) e.category = 'Category is required';
    if (!date) e.date = 'Date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    onSubmit({
      context: initial?.context || '',
      type,
      subtype: (subtype as TransactionSubtype) || undefined,
      amount: Number(amount),
      category,
      subcategory: subcategory || undefined,
      date,
      time: time || undefined,
      paymentMethod: paymentMethod || undefined,
      paymentApp: paymentApp || undefined,
      notes: notes || undefined,
    });
  }

  const noCats = expenseCategories.length === 0 && incomeCategories.length === 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Amount"
          type="number"
          placeholder="₹0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={errors.amount}
          min="0"
          step="any"
          className="w-full px-3 py-2 text-sm bg-bg-2 border border-card-border rounded-xl text-text placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            error={errors.date}
          />
          <Input
            label="Time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
      </div>

      {/* Grouped category select — Income / Expense optgroups */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-text-2">Category</label>
        <select
          value={category}
          onChange={(e) => handleCategoryChange(e.target.value)}
          disabled={noCats}
          className={[
            'w-full px-3 py-2 text-sm bg-bg-2 border rounded-xl text-text focus:outline-none focus:ring-2 focus:ring-accent/40 appearance-none transition-colors',
            errors.category ? 'border-red-400' : 'border-card-border',
            noCats ? 'opacity-50 cursor-not-allowed' : '',
          ].join(' ')}
          aria-label="Category"
        >
          <option value="">{noCats ? 'No categories defined' : 'Select category...'}</option>
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
        {errors.category && <p className="text-xs text-red-500">{errors.category}</p>}
      </div>

      <Select
        label="Subcategory"
        value={subcategory}
        onChange={(e) => setSubcategory(e.target.value)}
        options={subcategories.map((s) => ({ value: s, label: s }))}
        placeholder={category ? (subcategories.length === 0 ? 'None defined' : 'Optional') : 'Select category first'}
        disabled={!category || subcategories.length === 0}
      />

      <Select
        label="Classification (optional)"
        value={subtype}
        onChange={(e) => setSubtype(e.target.value as TransactionSubtype | '')}
        options={type === 'income' ? INCOME_SUBTYPES : EXPENSE_SUBTYPES}
        placeholder="Select classification..."
      />

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Payment Method"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          options={paymentMethods.map((m) => ({ value: m, label: m }))}
          placeholder={paymentMethods.length === 0 ? 'No methods defined' : 'Optional'}
          disabled={paymentMethods.length === 0}
        />
        <Select
          label="Payment App"
          value={paymentApp}
          onChange={(e) => setPaymentApp(e.target.value)}
          options={paymentApps.map((a) => ({ value: a, label: a }))}
          placeholder={paymentApps.length === 0 ? 'No apps defined' : 'Optional'}
          disabled={paymentApps.length === 0}
        />
      </div>

      <Textarea
        label="Notes"
        placeholder="Optional description... (Shift+Enter for new line)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        maxRows={5}
      />

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {initial ? 'Update' : 'Add'} Transaction
        </Button>
      </div>
    </form>
  );
}
