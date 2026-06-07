// Phase 7 contract — when AUTH_ENABLED is not 'true' (the default),
// every existing /api/* route must work without any Authorization header.
// Register/login endpoints are still callable for setup/testing.

const request = require('supertest');
const { setupTestDb } = require('../helpers/setup');
const buildApp = require('../helpers/app');

setupTestDb();
const app = buildApp();

describe('Auth disabled (default) — backward compat', () => {
  beforeEach(() => {
    delete process.env.AUTH_ENABLED;
    process.env.JWT_SECRET = 'test-secret';
  });

  it('GET /api/health works without a token', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/transactions works without a token', async () => {
    const res = await request(app).get('/api/transactions');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('POST /api/transactions works without a token', async () => {
    const res = await request(app).post('/api/transactions').send({
      type: 'expense', amount: 100, date: '2026-05-01',
    });
    expect(res.status).toBe(201);
  });

  it('GET /api/profiles works without a token (still auto-creates default)', async () => {
    const res = await request(app).get('/api/profiles');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].profileId).toBe('default');
  });

  it('GET /api/settings works without a token', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(200);
    expect(res.body.profileId).toBe('default');
  });

  it('register endpoint is still callable when auth is disabled', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'a@b.com',
      password: 'hunter2hunter2',
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.email).toBe('a@b.com');
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('login endpoint is still callable when auth is disabled', async () => {
    await request(app).post('/api/auth/register').send({
      email: 'c@d.com',
      password: 'hunter2hunter2',
    });
    const res = await request(app).post('/api/auth/login').send({
      email: 'c@d.com',
      password: 'hunter2hunter2',
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
  });
});
