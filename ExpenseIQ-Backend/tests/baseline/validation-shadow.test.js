// Phase 3 contract — shadow mode (default).
// Schemas run, but never reject. Phase 0 / Phase 2 behavior must be byte-identical.

const request = require('supertest');
const { setupTestDb } = require('../helpers/setup');
const buildApp = require('../helpers/app');

setupTestDb();
const app = buildApp();

describe('Validation: shadow mode (default)', () => {
  beforeEach(() => {
    delete process.env.VALIDATION_MODE; // ensure default
  });

  it('valid payload still succeeds (sanity)', async () => {
    const res = await request(app).post('/api/transactions').send({
      profileId: 'default',
      type: 'expense',
      amount: 100,
      date: '2026-05-01',
    });
    expect(res.status).toBe(201);
  });

  it('extra unknown fields are forwarded unchanged', async () => {
    const res = await request(app).post('/api/transactions').send({
      type: 'expense',
      amount: 100,
      date: '2026-05-01',
      unknownExtra: 'frontend-may-send-this',
    });
    expect(res.status).toBe(201);
  });

  it('Mongoose-required missing field still goes through Mongoose path (not Joi)', async () => {
    const res = await request(app).post('/api/transactions').send({ amount: 100, date: '2026-05-01' });
    expect(res.status).toBe(400);
    // Shadow mode does NOT short-circuit. Mongoose's ValidationError fires,
    // so the message format is Mongoose's, not Joi's.
    expect(res.body.error).toMatch(/validation/i);
  });

  it('PUT with no body still allowed in shadow', async () => {
    const created = await request(app).post('/api/transactions').send({
      type: 'expense', amount: 100, date: '2026-05-01',
    });
    const res = await request(app).put(`/api/transactions/${created.body._id}`).send({});
    expect(res.status).toBe(200);
  });

  // Profile route removed — /api/profiles no longer exists.

  it('Budget POST missing required is rejected by controller pre-check (unchanged)', async () => {
    const res = await request(app).post('/api/budgets').send({});
    expect(res.status).toBe(400);
    // Controller validates userId, month, category, amount are required
    expect(res.body.error).toMatch(/required/);
  });
});
