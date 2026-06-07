import { getList, postOne, del } from './http';
import type { Profile, NewProfile, ProfileId } from '@/lib/types/api';

export const profilesApi = {
  getAll: () =>
    getList<Profile>('/profiles'),

  create: (data: NewProfile) =>
    postOne<Profile>('/profiles', data),

  delete: (id: ProfileId) =>
    del(`/profiles/${id}`),
} as const;
