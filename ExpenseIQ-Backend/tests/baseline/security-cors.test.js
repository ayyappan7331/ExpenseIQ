// Phase 4 contract — CORS allowlist.
// Origin function reads process.env.CORS_ORIGIN per request, so we can
// mutate the env between tests without rebuilding the app.

const request = require('supertest');
const { setupTestDb } = require('../helpers/setup');
const buildApp = require('../helpers/app');

setupTestDb();
const app = buildApp();

describe('Security: CORS allowlist', () => {
  beforeEach(() => {
    delete process.env.CORS_ORIGIN;
  });
  afterAll(() => {
    delete process.env.CORS_ORIGIN;
  });

  describe('Default mode (no CORS_ORIGIN set) — permissive localhost', () => {
    it('allows http://localhost:<any-port>', async () => {
      const res = await request(app).get('/api/health').set('Origin', 'http://localhost:5500');
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5500');
    });

    it('allows http://127.0.0.1:<any-port>', async () => {
      const res = await request(app).get('/api/health').set('Origin', 'http://127.0.0.1:3000');
      expect(res.headers['access-control-allow-origin']).toBe('http://127.0.0.1:3000');
    });

    it('blocks non-localhost origins (no allow header)', async () => {
      const res = await request(app).get('/api/health').set('Origin', 'http://evil.com');
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('no-origin requests (curl, server-to-server) always pass', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
    });
  });

  describe('Allowlist mode (CORS_ORIGIN set)', () => {
    it('only allows configured origins', async () => {
      process.env.CORS_ORIGIN = 'http://localhost:3000';
      const allowed = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:3000');
      const blocked = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:5500');
      expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('supports comma-separated list', async () => {
      process.env.CORS_ORIGIN = 'http://localhost:3000, http://localhost:5500';
      const a = await request(app).get('/api/health').set('Origin', 'http://localhost:3000');
      const b = await request(app).get('/api/health').set('Origin', 'http://localhost:5500');
      const c = await request(app).get('/api/health').set('Origin', 'http://localhost:8080');
      expect(a.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(b.headers['access-control-allow-origin']).toBe('http://localhost:5500');
      expect(c.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('Preflight (OPTIONS)', () => {
    it('responds with Access-Control-Allow-Origin for allowed origins', async () => {
      const res = await request(app)
        .options('/api/transactions')
        .set('Origin', 'http://localhost:5500')
        .set('Access-Control-Request-Method', 'POST');
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5500');
    });
  });
});
