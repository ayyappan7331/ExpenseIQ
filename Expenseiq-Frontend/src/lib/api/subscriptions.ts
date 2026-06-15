import { getList, postOne, putOne, del } from './http';
import type { Subscription, NewSubscription, SubscriptionUpdate } from '@/lib/types/api';

export const subscriptionsApi = {
  getAll: (opts: { context?: string } = {}) =>
    getList<Subscription>('/subscriptions', { context: opts.context }),

  create: (data: NewSubscription) =>
    postOne<Subscription>('/subscriptions', data),

  update: (id: string, data: SubscriptionUpdate) =>
    putOne<Subscription>(`/subscriptions/${id}`, data),

  delete: (id: string) =>
    del(`/subscriptions/${id}`),
} as const;
