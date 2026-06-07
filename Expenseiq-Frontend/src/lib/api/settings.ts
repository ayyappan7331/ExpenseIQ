import { getOne, putOne, request } from './http';
import type { Settings, SettingsUpdate, DbStatsResponse, ProfileId } from '@/lib/types/api';

export const settingsApi = {
  get: (opts: { profileId?: ProfileId } = {}) =>
    getOne<Settings>('/settings', { profileId: opts.profileId }),

  update: (data: SettingsUpdate) =>
    putOne<Settings>('/settings', data),

  getDbStats: () =>
    request<DbStatsResponse>('/settings/db-stats'),
} as const;
