import { getList, postOne, putOne, del, request, normalizeOne } from './http';
import type { CreditCard, NewCreditCard, CreditCardUpdate } from '@/lib/types/api';

export const creditCardsApi = {
  getAll: (opts: { context?: string } = {}) =>
    getList<CreditCard>('/creditcards', { context: opts.context }),

  getArchived: (opts: { context?: string } = {}) =>
    getList<CreditCard>('/creditcards/archived', { context: opts.context }),

  create: (data: NewCreditCard) =>
    postOne<CreditCard>('/creditcards', data),

  update: (id: string, data: CreditCardUpdate) =>
    putOne<CreditCard>(`/creditcards/${id}`, data),

  archive: async (id: string) => {
    const doc = await request<CreditCard>(`/creditcards/${id}/archive`, { method: 'POST' });
    return normalizeOne(doc);
  },

  restore: async (id: string) => {
    const doc = await request<CreditCard>(`/creditcards/${id}/restore`, { method: 'POST' });
    return normalizeOne(doc);
  },

  delete: (id: string) =>
    del(`/creditcards/${id}`),
} as const;
