import { getOne, putOne, request, normalizeOne } from './http';
import type { FinancialConfig, ProfileId } from '@/lib/types/api';

export const financialConfigApi = {
  get: (opts: { profileId?: ProfileId } = {}) =>
    getOne<FinancialConfig>('/financial-config', { profileId: opts.profileId }),

  /** Full replacement — use when sending all fields. */
  update: (data: Partial<FinancialConfig> & { profileId: ProfileId }) =>
    putOne<FinancialConfig>('/financial-config', data),

  /** Partial update — only provided fields are changed. Preferred for mutations. */
  patch: async (data: Partial<FinancialConfig> & { profileId: ProfileId }) => {
    const doc = await request<FinancialConfig>('/financial-config', { method: 'PATCH', body: data });
    return normalizeOne(doc);
  },
} as const;
