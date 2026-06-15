import { getList, postOne, del } from './http';
import type { Budget, NewBudget } from '@/lib/types/api';

export const budgetsApi = {
  getAll: (opts: { context?: string; month?: string } = {}) =>
    getList<Budget>('/budgets', { context: opts.context, month: opts.month }),

  upsert: (data: NewBudget) =>
    postOne<Budget>('/budgets', data),

  delete: (id: string) =>
    del(`/budgets/${id}`),
} as const;
