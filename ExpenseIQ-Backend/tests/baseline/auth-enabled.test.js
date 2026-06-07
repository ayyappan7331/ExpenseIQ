// Phase 7 contract — when AUTH_ENABLED=true, /api/* (except /api/health
// and /api/auth/*) requires a valid Authorization: Bearer <jwt> header.

const request = require('supertest');
const { setupTestDb } = require('../helpers/setup');
const buildApp = require('../helpers/app');

setupTestDb();
const app = buildApp();

const registerAndLogin = async (email = 'user@example.com', password = 'hunter2hunter2') => {
  await request(app).post('/api/auth/register').send({ email, password });
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token;
};

describe('Auth enabled', () => {
  beforeAll(() => {
    process.env.AUTH_ENABLED = 'true';
    process.env.JWT_SECRET = 'test-secret-for-phase-7';
    process.env.JWT_EXPIRY = '1h';
  });
  afterAll(() => {
    delete process.env.AUTH_ENABLED;
    delete process.env.JWT_SECRET;
    delete process.env.JWT_EXPIRY;
  });

  describe('Public endpoints (always allowed)', () => {
    it('GET /api/health works without token', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
    });

    it('POST /api/auth/register works without token', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'first@example.com',
        password: 'hunter2hunter2',
      });
      expect(res.status).toBe(201);
    });

    it('POST /api/auth/login works without token', async () => {
      await request(app).post('/api/auth/register').send({
        email: 'second@example.com',
        password: 'hunter2hunter2',
      });
      const res = await request(app).post('/api/auth/login').send({
        email: 'second@example.com',
        password: 'hunter2hunter2',
      });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });
  });

  describe('Protected endpoints', () => {
    it('GET /api/transactions WITHOUT token returns 401', async () => {
      const res = await request(app).get('/api/transactions');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Missing token' });
    });

    it('GET /api/transactions with malformed Authorization returns 401', async () => {
      const res = await request(app).get('/api/transactions').set('Authorization', 'Basic abc');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Missing token' });
    });

    it('GET /api/transactions with invalid JWT returns 401', async () => {
      const res = await request(app).get('/api/transactions').set('Authorization', 'Bearer not-a-jwt');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Invalid token' });
    });

    it('GET /api/transactions with valid token returns 200', async () => {
      const token = await registerAndLogin('user1@example.com');
      const res = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('POST /api/transactions with valid token creates as before', async () => {
      const token = await registerAndLogin('user2@example.com');
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'expense', amount: 100, date: '2026-05-01' });
      expect(res.status).toBe(201);
      expect(res.body.amount).toBe(100);
      expect(res.body.date).toBe('2026-05-01');
    });

    it('All resource collections are gated', async () => {
      const paths = [
        '/api/transactions',
        '/api/subscriptions',
        '/api/debts',
        '/api/goals',
        '/api/profiles',
        '/api/creditcards',
        '/api/settings',
        '/api/budgets',
      ];
      const results = await Promise.all(paths.map((p) => request(app).get(p)));
      for (const res of results) {
        expect(res.status).toBe(401);
      }
    });
  });

  describe('Auth service error paths', () => {
    it('register rejects duplicate email with 400', async () => {
      await request(app).post('/api/auth/register').send({
        email: 'dup@example.com',
        password: 'hunter2hunter2',
      });
      const res = await request(app).post('/api/auth/register').send({
        email: 'dup@example.com',
        password: 'hunter2hunter2',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already/i);
    });

    it('login with wrong password returns 401', async () => {
      await request(app).post('/api/auth/register').send({
        email: 'pw@example.com',
        password: 'rightpasswordhere',
      });
      const res = await request(app).post('/api/auth/login').send({
        email: 'pw@example.com',
        password: 'wrongpasswordhere',
      });
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Invalid credentials' });
    });

    it('login with unknown email returns 401', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'ghost@example.com',
        password: 'anythinghere',
      });
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Invalid credentials' });
    });

    it('register with missing fields returns 400 (service-level guard)', async () => {
      const res = await request(app).post('/api/auth/register').send({});
      expect(res.status).toBe(400);
    });

    it('register response never leaks passwordHash', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'leak-test@example.com',
        password: 'hunter2hunter2',
      });
      expect(res.body).not.toHaveProperty('passwordHash');
    });
  });

  describe('Token payload', () => {
    it('token decodes to { userId, email, iat, exp }', async () => {
      const token = await registerAndLogin('decode@example.com');
      const jwt = require('jsonwebtoken');
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      expect(payload.email).toBe('decode@example.com');
      expect(typeof payload.userId).toBe('string');
      expect(typeof payload.iat).toBe('number');
      expect(typeof payload.exp).toBe('number');
      expect(payload.exp).toBeGreaterThan(payload.iat);
    });
  });
});
