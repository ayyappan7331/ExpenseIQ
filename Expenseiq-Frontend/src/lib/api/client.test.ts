import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { api } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:5000/api';

describe('api client', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('normalization (_id → id)', () => {
    it('list responses are normalized', async () => {
      const list = await api.getTransactions();
      expect(list).toHaveLength(2);
      for (const t of list) {
        expect(t.id).toBeDefined();
        expect(typeof t.id).toBe('string');
      }
    });

    it('single-document responses are normalized', async () => {
      const settings = await api.getSettings();
      expect(settings.id).toBeDefined();
      expect(settings.profileId).toBe('default');
    });

    it('idempotent when only id is present (no _id)', async () => {
      server.use(
        http.get(`${BASE}/transactions`, () =>
          HttpResponse.json([{ id: 'already-normalized', profileId: 'p', type: 'expense', amount: 1, date: '2026-01-01' }])
        )
      );
      const list = await api.getTransactions();
      expect(list[0].id).toBe('already-normalized');
    });
  });

  describe('error handling', () => {
    it('throws ApiError with the message from the JSON body', async () => {
      server.use(
        http.get(`${BASE}/transactions`, () =>
          HttpResponse.json({ error: 'Not found' }, { status: 404 })
        )
      );
      await expect(api.getTransactions()).rejects.toBeInstanceOf(ApiError);
      try {
        await api.getTransactions();
      } catch (err) {
        const e = err as ApiError;
        expect(e.status).toBe(404);
        expect(e.message).toBe('Not found');
      }
    });

    it('throws ApiError when the response is not JSON', async () => {
      server.use(
        http.get(`${BASE}/transactions`, () =>
          new HttpResponse('boom', { status: 500, headers: { 'content-type': 'text/plain' } })
        )
      );
      await expect(api.getTransactions()).rejects.toMatchObject({
        name: 'ApiError',
        status: 500,
      });
    });
  });

  describe('query-string construction', () => {
    it('omits empty/null/undefined query params', async () => {
      let capturedUrl = '';
      server.use(
        http.get(`${BASE}/transactions`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json([]);
        })
      );
      await api.getTransactions({ profileId: 'work', month: undefined });
      expect(capturedUrl).toContain('profileId=work');
      expect(capturedUrl).not.toContain('month=');
    });

    it('passes month when supplied', async () => {
      let capturedUrl = '';
      server.use(
        http.get(`${BASE}/transactions`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json([]);
        })
      );
      await api.getTransactions({ profileId: 'default', month: '2026-05' });
      expect(capturedUrl).toContain('month=2026-05');
    });
  });

  describe('writes', () => {
    it('createTransaction posts the body and normalizes the response', async () => {
      const created = await api.createTransaction({
        profileId: 'default',
        type: 'expense',
        amount: 100,
        date: '2026-05-01',
      });
      expect(created.id).toBeDefined();
      expect(created.amount).toBe(100);
    });

    it('updateTransaction sends PUT to /:id', async () => {
      let calledUrl = '';
      server.use(
        http.put(`${BASE}/transactions/:id`, ({ request, params }) => {
          calledUrl = request.url;
          return HttpResponse.json({ _id: String(params.id), amount: 999 });
        })
      );
      const updated = await api.updateTransaction('abc123', { amount: 999 });
      expect(calledUrl).toContain('/transactions/abc123');
      expect(updated.id).toBe('abc123');
    });

    it('bulkDeleteTransactions sends an ids array and returns the message', async () => {
      const res = await api.bulkDeleteTransactions(['a', 'b', 'c']);
      expect(res.message).toBe('3 deleted');
    });
  });

  describe('health & version', () => {
    it('health returns ok + timestamp', async () => {
      const h = await api.health();
      expect(h.status).toBe('ok');
      expect(typeof h.timestamp).toBe('string');
    });

    it('version returns version + gitSha + nodeEnv', async () => {
      const v = await api.version();
      expect(v).toEqual(
        expect.objectContaining({
          version: expect.any(String),
          gitSha: expect.any(String),
          nodeEnv: expect.any(String),
        })
      );
    });
  });
});
