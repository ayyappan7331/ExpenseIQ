import { getList, postOne, del } from './http';
import type { Goal, NewGoal } from '@/lib/types/api';

export const goalsApi = {
  getAll: (opts: { context?: string } = {}) =>
    getList<Goal>('/goals', { context: opts.context }),

  upsert: (data: NewGoal) =>
    postOne<Goal>('/goals', data),

  delete: (id: string) =>
    del(`/goals/${id}`),
} as const;
