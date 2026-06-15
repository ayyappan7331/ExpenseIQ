import { getList, postOne, putOne, del } from './http';
import type { Debt, NewDebt, DebtUpdate } from '@/lib/types/api';

export const debtsApi = {
  getAll: (opts: { context?: string } = {}) =>
    getList<Debt>('/debts', { context: opts.context }),

  create: (data: NewDebt) =>
    postOne<Debt>('/debts', data),

  update: (id: string, data: DebtUpdate) =>
    putOne<Debt>(`/debts/${id}`, data),

  delete: (id: string) =>
    del(`/debts/${id}`),
} as const;
