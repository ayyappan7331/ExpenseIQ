// Phase 2 contract: Mongoose errors must surface through the central
// errorHandler with the same response shape { error: <message> } that
// the old per-controller try/catch returned.

const request = require('supertest');
const { setupTestDb } = require('../helpers/setup');
const buildApp = require('../helpers/app');

setupTestDb();
const app = buildApp();

describe('Centralized error mapping', () => {
  describe('ValidationError (missing required fields) -> 400', () => {
    it('POST /api/transactions with empty body', async () => {
      const res = await request(app).post('/api/transactions').send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(typeof res.body.error).toBe('string');
    });

    it('POST /api/subscriptions with missing name+amount', async () => {
      const res = await request(app).post('/api/subscriptions').send({ profileId: 'default' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('POST /api/debts with invalid enum value', async () => {
      const res = await request(app).post('/api/debts').send({
        type: 'invalid-type',
        person: 'X',
        amount: 1,
        date: '2026-05-01',
      });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('CastError (malformed ObjectId) -> 400', () => {
    it('PUT /api/transactions/:id with non-ObjectId', async () => {
      const res = await request(app)
        .put('/api/transactions/not-a-real-id')
        .send({ amount: 5 });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('DELETE /api/transactions/:id with non-ObjectId', async () => {
      const res = await request(app).delete('/api/transactions/not-a-real-id');
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('DELETE /api/budgets/:id with non-ObjectId', async () => {
      const res = await request(app).delete('/api/budgets/not-a-real-id');
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('Duplicate key (unique index) -> 400', () => {
    it('POST /api/profiles twice with same profileId', async () => {
      const first = await request(app)
        .post('/api/profiles')
        .send({ profileId: 'work', name: 'Work' });
      expect(first.status).toBe(201);

      const second = await request(app)
        .post('/api/profiles')
        .send({ profileId: 'work', name: 'Work 2' });
      expect(second.status).toBe(400);
      expect(second.body).toHaveProperty('error');
      // Mongo duplicate-key message contains "E11000"
      expect(second.body.error).toMatch(/E11000|duplicate/i);
    });
  });

  describe('Happy paths still unchanged', () => {
    it('POST /api/transactions with valid body returns 201', async () => {
      const res = await request(app).post('/api/transactions').send({
        profileId: 'default',
        type: 'expense',
        amount: 100,
        date: '2026-05-01',
      });
      expect(res.status).toBe(201);
    });

    it('PUT /api/transactions/:id with valid ObjectId but no doc returns 404', async () => {
      const res = await request(app)
        .put('/api/transactions/507f1f77bcf86cd799439011')
        .send({ amount: 1 });
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Not found' });
    });

    it('DELETE /api/transactions/:id with valid ObjectId but no doc returns 404', async () => {
      const res = await request(app).delete('/api/transactions/507f1f77bcf86cd799439011');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Not found' });
    });
  });
});
