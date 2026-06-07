// Phase 4 contract — express-rate-limit returns 429 when the budget is exhausted.
// Uses a dedicated app instance with max=3 so we can prove the transition
// without burning the default 300/min budget shared by other suites.

const request = require('supertest');
const { setupTestDb } = require('../helpers/setup');
const buildApp = require('../helpers/app');

setupTestDb();
const app = buildApp({ rateLimit: { max: 3, windowMs: 60_000 } });

describe('Security: rate limit (max=3 per minute)', () => {
  it('1st request: allowed, sets standard RateLimit headers', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.headers['ratelimit-limit']).toBe('3');
    expect(res.headers['ratelimit-remaining']).toBe('2');
  });

  it('2nd request: allowed', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.headers['ratelimit-remaining']).toBe('1');
  });

  it('3rd request: allowed (last under the cap)', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.headers['ratelimit-remaining']).toBe('0');
  });

  it('4th request: 429 with { error: "Too many requests" }', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(429);
    expect(res.body).toEqual({ error: 'Too many requests' });
  });

  it('subsequent requests stay 429 until the window resets', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(429);
  });
});

describe('Security: rate limit does not apply outside /api', () => {
  // Default-limit app (300/min) so we don't hit cross-test contention here.
  const app2 = buildApp();

  it('rate-limit headers ARE set on /api routes', async () => {
    const res = await request(app2).get('/api/health');
    expect(res.headers['ratelimit-limit']).toBeDefined();
  });

  it('rate-limit headers are NOT set on non-/api paths', async () => {
    const res = await request(app2).get('/');
    // Express returns 404 for unmatched; rate-limit shouldn't have fired.
    expect(res.headers['ratelimit-limit']).toBeUndefined();
  });
});
