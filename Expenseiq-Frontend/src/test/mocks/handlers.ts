// MSW handlers — one entry per backend endpoint. Behavior is intentionally
// minimal: GETs return fixture data; POST/PUT/DELETE acknowledge with a
// shaped response so the API client's normalization runs. We do NOT
// maintain an in-memory store here — tests that need state-bearing
// behavior should override the handlers locally via `server.use(...)`.
//
// Base URL pulls from NEXT_PUBLIC_API_BASE so the handlers track whatever
// `.env.local` or `.env.test` says.

import { http, HttpResponse } from 'msw';
import { fixtures } from './fixtures';

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:5000/api';
const u = (path: string) => `${BASE}${path}`;

export const handlers = [
  // ── Health / version ──────────────────────────────────────
  http.get(u('/health'), () => HttpResponse.json(fixtures.health)),
  http.get(u('/version'), () => HttpResponse.json(fixtures.version)),

  // ── Auth ──────────────────────────────────────────────────
  http.post(u('/auth/register'), async ({ request }) => {
    const body = (await request.json()) as { email: string };
    return HttpResponse.json({ id: '507f1f77bcf86cd799439999', email: body.email }, { status: 201 });
  }),
  http.post(u('/auth/login'), async ({ request }) => {
    const body = (await request.json()) as { email: string };
    return HttpResponse.json({
      token: 'test-token',
      user: { id: '507f1f77bcf86cd799439999', email: body.email },
    });
  }),

  // ── Transactions ──────────────────────────────────────────
  http.get(u('/transactions'), () => HttpResponse.json(fixtures.transactions)),
  http.post(u('/transactions'), async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ _id: '507f1f77bcf86cd799439900', ...body }, { status: 201 });
  }),
  http.post(u('/transactions/bulk'), async ({ request }) => {
    const body = (await request.json()) as Array<Record<string, unknown>>;
    return HttpResponse.json(
      body.map((b, i) => ({ _id: `507f1f77bcf86cd79943990${i}`, ...b })),
      { status: 201 }
    );
  }),
  http.put(u('/transactions/:id'), async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ _id: String(params.id), ...body });
  }),
  http.delete(u('/transactions/:id'), () => HttpResponse.json({ message: 'Deleted' })),
  http.post(u('/transactions/bulk-delete'), async ({ request }) => {
    const body = (await request.json()) as { ids: string[] };
    return HttpResponse.json({ message: `${body.ids.length} deleted` });
  }),

  // ── Subscriptions ─────────────────────────────────────────
  http.get(u('/subscriptions'), () => HttpResponse.json(fixtures.subscriptions)),
  http.post(u('/subscriptions'), async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ _id: '507f1f77bcf86cd799439a00', ...body }, { status: 201 });
  }),
  http.put(u('/subscriptions/:id'), async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ _id: String(params.id), ...body });
  }),
  http.delete(u('/subscriptions/:id'), () => HttpResponse.json({ message: 'Deleted' })),

  // ── Debts ─────────────────────────────────────────────────
  http.get(u('/debts'), () => HttpResponse.json(fixtures.debts)),
  http.post(u('/debts'), async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ _id: '507f1f77bcf86cd799439b00', ...body }, { status: 201 });
  }),
  http.put(u('/debts/:id'), async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ _id: String(params.id), ...body });
  }),
  http.delete(u('/debts/:id'), () => HttpResponse.json({ message: 'Deleted' })),

  // ── Goals ─────────────────────────────────────────────────
  http.get(u('/goals'), () => HttpResponse.json(fixtures.goals)),
  http.post(u('/goals'), async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ _id: '507f1f77bcf86cd799439c00', ...body });
  }),
  http.delete(u('/goals/:id'), () => HttpResponse.json({ message: 'Deleted' })),

  // ── Profiles ──────────────────────────────────────────────
  http.get(u('/profiles'), () => HttpResponse.json(fixtures.profiles)),
  http.post(u('/profiles'), async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ _id: '507f1f77bcf86cd799439d00', ...body }, { status: 201 });
  }),
  http.delete(u('/profiles/:id'), () =>
    HttpResponse.json({ message: 'Deleted with cascade' })
  ),

  // ── Credit cards ──────────────────────────────────────────
  http.get(u('/creditcards'), () => HttpResponse.json(fixtures.creditCards)),
  http.post(u('/creditcards'), async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ _id: '507f1f77bcf86cd799439e00', ...body }, { status: 201 });
  }),
  http.put(u('/creditcards/:id'), async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ _id: String(params.id), ...body });
  }),
  http.delete(u('/creditcards/:id'), () => HttpResponse.json({ message: 'Deleted' })),

  // ── Settings ──────────────────────────────────────────────
  http.get(u('/settings'), () => HttpResponse.json(fixtures.settings)),
  http.put(u('/settings'), async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...fixtures.settings, ...body });
  }),

  // ── FinancialConfig ───────────────────────────────────────
  http.get(u('/financial-config'), () => HttpResponse.json(fixtures.financialConfig)),
  http.put(u('/financial-config'), async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...fixtures.financialConfig, ...body });
  }),
  http.patch(u('/financial-config'), async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...fixtures.financialConfig, ...body });
  }),
  http.get(u('/settings/db-stats'), () =>
    HttpResponse.json({
      dataSize: 12345,
      indexSize: 6789,
      storageSize: 20000,
      usedBytes: 19134,
      limitBytes: 512 * 1024 * 1024,
      collections: 8,
      objects: 42,
      db: 'expenseiq-test',
    })
  ),

  // ── Budgets ───────────────────────────────────────────────
  http.get(u('/budgets'), () => HttpResponse.json(fixtures.budgets)),
  http.post(u('/budgets'), async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ _id: '507f1f77bcf86cd799439f00', ...body });
  }),
  http.delete(u('/budgets/:id'), () => HttpResponse.json({ message: 'Deleted' })),
];
