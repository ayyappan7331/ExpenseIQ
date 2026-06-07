import { getList, postOne, putOne, del } from './http';
import type { Subscription, NewSubscription, SubscriptionUpdate, ProfileId } from '@/lib/types/api';

export const subscriptionsApi = {
  getAll: (opts: { profileId?: ProfileId } = {}) =>
    getList<Subscription>('/subscriptions', { profileId: opts.profileId }),

  create: (data: NewSubscription) =>
    postOne<Subscription>('/subscriptions', data),

  update: (id: string, data: SubscriptionUpdate) =>
    putOne<Subscription>(`/subscriptions/${id}`, data),

  delete: (id: string) =>
    del(`/subscriptions/${id}`),
} as const;
