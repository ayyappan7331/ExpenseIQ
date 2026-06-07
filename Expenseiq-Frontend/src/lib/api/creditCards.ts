import { getList, postOne, putOne, del, request, normalizeOne } from './http';
import type { CreditCard, NewCreditCard, CreditCardUpdate, ProfileId } from '@/lib/types/api';

export const creditCardsApi = {
  getAll: (opts: { profileId?: ProfileId } = {}) =>
    getList<CreditCard>('/creditcards', { profileId: opts.profileId }),

  getArchived: (opts: { profileId?: ProfileId } = {}) =>
    getList<CreditCard>('/creditcards/archived', { profileId: opts.profileId }),

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
