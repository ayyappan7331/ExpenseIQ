import { getList, postOne, del } from './http';
import type { Goal, NewGoal, ProfileId } from '@/lib/types/api';

export const goalsApi = {
  getAll: (opts: { profileId?: ProfileId } = {}) =>
    getList<Goal>('/goals', { profileId: opts.profileId }),

  upsert: (data: NewGoal) =>
    postOne<Goal>('/goals', data),

  delete: (id: string) =>
    del(`/goals/${id}`),
} as const;
