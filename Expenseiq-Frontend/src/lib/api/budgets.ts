import { getList, postOne, del } from './http';
import type { Budget, NewBudget, ProfileId } from '@/lib/types/api';

export const budgetsApi = {
  getAll: (opts: { profileId?: ProfileId; month?: string } = {}) =>
    getList<Budget>('/budgets', { profileId: opts.profileId, month: opts.month }),

  upsert: (data: NewBudget) =>
    postOne<Budget>('/budgets', data),

  delete: (id: string) =>
    del(`/budgets/${id}`),
} as const;
