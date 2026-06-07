'use client';

import { useState } from 'react';
import { Button, Input, Select } from '@/components/ui';
import { useCategories } from '@/lib/hooks/useCategories';
import type { Budget, NewBudget } from '@/lib/types/api';

interface Props {
  initial?: Budget;
  month: string;
  profileId: string;
  onSubmit: (data: NewBudget) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function BudgetForm({ initial, month, profileId, onSubmit, onCancel, loading }: Props) {
  const [category, setCategory] = useState(initial?.category || '');
  const [amount, setAmount] = useState(initial?.amount?.toString() || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { expenseCategories } = useCategories();

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!category) e.category = 'Category is required';
    if (!amount || Number(amount) <= 0) e.amount = 'Amount must be greater than 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    onSubmit({ profileId, month, category, amount: Number(amount) });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        options={expenseCategories.map((c) => ({ value: c, label: c }))}
        placeholder={expenseCategories.length === 0 ? 'No categories defined' : 'Select category...'}
        error={errors.category}
        disabled={!!initial || expenseCategories.length === 0}
      />
      <Input
        label="Budget Amount"
        type="number"
        placeholder="₹0"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        error={errors.amount}
        min="0"
        step="any"
        autoFocus={!!initial}
      />
      <div className="flex items-center justify-end gap-2 pt-2">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button type="submit" loading={loading}>{initial ? 'Update' : 'Set'} Budget</Button>
      </div>
    </form>
  );
}
