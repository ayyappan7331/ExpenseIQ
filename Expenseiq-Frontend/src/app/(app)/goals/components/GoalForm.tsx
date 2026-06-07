'use client';

import { useState } from 'react';
import { Button, Input } from '@/components/ui';
import type { NewGoal } from '@/lib/types/api';

interface Props {
  month: string;
  profileId: string;
  initialAmount?: number;
  onSubmit: (data: NewGoal) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function GoalForm({ month, profileId, initialAmount, onSubmit, onCancel, loading }: Props) {
  const [amount, setAmount] = useState(initialAmount?.toString() || '');
  const [error, setError] = useState('');

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!amount || Number(amount) <= 0) { setError('Amount must be greater than 0'); return; }
    setError('');
    onSubmit({ profileId, month, amount: Number(amount) });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-text-3">Set your savings target for <span className="font-medium text-text-2">{month}</span></p>
      <Input
        label="Savings Goal"
        type="number"
        placeholder="₹0"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        error={error}
        min="0"
        step="any"
        autoFocus
      />
      <div className="flex items-center justify-end gap-2 pt-2">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button type="submit" loading={loading}>Save Goal</Button>
      </div>
    </form>
  );
}
