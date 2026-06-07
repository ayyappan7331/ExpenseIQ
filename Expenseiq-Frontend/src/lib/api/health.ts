import { request } from './http';
import type { HealthResponse, VersionResponse } from '@/lib/types/api';

export const healthApi = {
  check: () => request<HealthResponse>('/health'),
  version: () => request<VersionResponse>('/version'),
} as const;
