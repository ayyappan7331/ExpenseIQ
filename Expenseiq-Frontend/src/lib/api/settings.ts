import { getOne, putOne, request } from './http';
import type { Settings, SettingsUpdate, DbStatsResponse } from '@/lib/types/api';

export const settingsApi = {
  get: (opts: { context?: string } = {}) =>
    getOne<Settings>('/settings', { context: opts.context }),

  update: (data: SettingsUpdate) =>
    putOne<Settings>('/settings', data),

  getDbStats: () =>
    request<DbStatsResponse>('/settings/db-stats'),
} as const;
