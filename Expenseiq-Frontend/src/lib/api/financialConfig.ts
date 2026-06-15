import { getOne, putOne, request, normalizeOne } from './http';
import type { FinancialConfig } from '@/lib/types/api';

export const financialConfigApi = {
  get: (opts: { context?: string } = {}) =>
    getOne<FinancialConfig>('/financial-config', { context: opts.context }),

  /** Full replacement — use when sending all fields. */
  update: (data: Partial<FinancialConfig> & { context: string }) =>
    putOne<FinancialConfig>('/financial-config', data),

  /** Partial update — only provided fields are changed. Preferred for mutations. */
  patch: async (data: Partial<FinancialConfig> & { context: string }) => {
    const doc = await request<FinancialConfig>('/financial-config', { method: 'PATCH', body: data });
    return normalizeOne(doc);
  },
} as const;
