import { getList, postOne, putOne, del } from './http';
import type { Debt, NewDebt, DebtUpdate, ProfileId } from '@/lib/types/api';

export const debtsApi = {
  getAll: (opts: { profileId?: ProfileId } = {}) =>
    getList<Debt>('/debts', { profileId: opts.profileId }),

  create: (data: NewDebt) =>
    postOne<Debt>('/debts', data),

  update: (id: string, data: DebtUpdate) =>
    putOne<Debt>(`/debts/${id}`, data),

  delete: (id: string) =>
    del(`/debts/${id}`),
} as const;
