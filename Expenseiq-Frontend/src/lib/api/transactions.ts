import { getList, postOne, putOne, del, request, normalizeMany } from './http';
import type {
  Transaction,
  NewTransaction,
  TransactionUpdate,
  MessageResponse,
  ProfileId,
} from '@/lib/types/api';

export const transactionsApi = {
  getAll: (opts: { profileId?: ProfileId; month?: string } = {}) =>
    getList<Transaction>('/transactions', { profileId: opts.profileId, month: opts.month }),

  create: (data: NewTransaction) =>
    postOne<Transaction>('/transactions', data),

  update: (id: string, data: TransactionUpdate) =>
    putOne<Transaction>(`/transactions/${id}`, data),

  delete: (id: string) =>
    del(`/transactions/${id}`),

  bulkCreate: (data: NewTransaction[]) =>
    request<Transaction[]>('/transactions/bulk', { method: 'POST', body: data }).then(normalizeMany),

  bulkDelete: (ids: string[]) =>
    request<MessageResponse>('/transactions/bulk-delete', { method: 'POST', body: { ids } }),
} as const;
