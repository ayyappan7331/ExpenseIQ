// Shared HTTP transport layer for all domain API modules.
// Extracted from client.ts so domain modules can import without circular deps.
//
// Responsibilities:
//   1. Build URLs with query strings
//   2. Execute typed fetch requests
//   3. Normalize Mongo _id → id on every response document
//   4. Throw ApiError for non-2xx responses

import { ApiError } from './errors';
import { getToken, clearToken, isAuthEnabled } from './token';

export const API_BASE: string =
  process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:5000/api';

if (typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_API_BASE) {
  console.warn(
    '[ExpenseIQ] NEXT_PUBLIC_API_BASE is not set. Falling back to http://localhost:5000/api. ' +
    'Set this in .env.local or your deployment environment.'
  );
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  signal?: AbortSignal;
}

export function buildUrl(path: string, query?: RequestOptions['query']): string {
  let url = `${API_BASE}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }
  return url;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = buildUrl(path, opts.query);
  const init: RequestInit = {
    method: opts.method ?? 'GET',
    signal: opts.signal,
  };

  // Build headers — always start with any body content-type, then inject auth
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(opts.body);
  }
  if (isAuthEnabled()) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  if (Object.keys(headers).length > 0) init.headers = headers;

  const res = await fetch(url, init);

  // 401 → clear stale token and redirect to login
  if (res.status === 401 && isAuthEnabled()) {
    clearToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw await ApiError.fromResponse(res);
  }

  if (!res.ok) throw await ApiError.fromResponse(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// Mongo _id → id normalizer. Idempotent.
type WithMongoId = { _id?: unknown; id?: unknown };

export function normalizeOne<T extends WithMongoId>(doc: T): T {
  if (!doc || typeof doc !== 'object') return doc;
  if (doc.id === undefined && doc._id !== undefined) {
    return { ...doc, id: String(doc._id) } as T;
  }
  return doc;
}

export function normalizeMany<T extends WithMongoId>(docs: T[]): T[] {
  return Array.isArray(docs) ? docs.map(normalizeOne) : docs;
}

export async function getList<T extends WithMongoId>(
  path: string,
  query?: RequestOptions['query']
): Promise<T[]> {
  const list = await request<T[]>(path, { query });
  return normalizeMany(list);
}

export async function getOne<T extends WithMongoId>(
  path: string,
  query?: RequestOptions['query']
): Promise<T> {
  const doc = await request<T>(path, { query });
  return normalizeOne(doc);
}

export async function postOne<T extends WithMongoId>(
  path: string,
  body: unknown
): Promise<T> {
  const doc = await request<T>(path, { method: 'POST', body });
  return normalizeOne(doc);
}

export async function putOne<T extends WithMongoId>(
  path: string,
  body: unknown
): Promise<T> {
  const doc = await request<T>(path, { method: 'PUT', body });
  return normalizeOne(doc);
}

export function del<T = import('@/lib/types/api').MessageResponse>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}
