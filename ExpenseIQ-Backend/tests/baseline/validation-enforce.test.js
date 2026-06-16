// Phase 3 contract — enforce mode.
// Joi rejects mismatched payloads with 400 BEFORE the controller runs.
// Status code is 400 (same as Mongoose path) but the error message comes from Joi.

const request = require('supertest');
const { setupTestDb } = require('../helpers/setup');
const buildApp = require('../helpers/app');

setupTestDb();
const app = buildApp();

describe('Validation: enforce mode', () => {
  beforeAll(() => {
    process.env.VALIDATION_MODE = 'enforce';
  });
  afterAll(() => {
    delete process.env.VALIDATION_MODE;
  });

  it('rejects POST /api/transactions missing required type', async () => {
    const res = await request(app).post('/api/transactions').send({
      amount: 100,
      date: '2026-05-01',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/"type"|type/);
  });

  it('rejects POST /api/transactions with invalid enum value', async () => {
    const res = await request(app).post('/api/transactions').send({
      type: 'bogus',
      amount: 100,
      date: '2026-05-01',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/type/);
  });

  it('rejects POST /api/transactions/bulk-delete with non-array ids', async () => {
    const res = await request(app).post('/api/transactions/bulk-delete').send({
      ids: 'not-an-array',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/ids/);
  });

  it('rejects POST /api/debts with invalid enum type', async () => {
    const res = await request(app).post('/api/debts').send({
      type: 'gifted',
      person: 'Alice',
      amount: 100,
      date: '2026-05-01',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/type/);
  });

  it('rejects POST /api/goals missing month', async () => {
    const res = await request(app).post('/api/goals').send({ amount: 1000 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/month/);
  });


  it('rejects PUT /api/creditcards/:id with billDate of wrong type', async () => {
    // First create one with a valid payload, then try a bad update
    delete process.env.VALIDATION_MODE; // create in shadow
    const created = await request(app).post('/api/creditcards').send({
      name: 'HDFC', billDate: 1, dueDate: 15,
    });
    process.env.VALIDATION_MODE = 'enforce';

    const res = await request(app)
      .put(`/api/creditcards/${created.body._id}`)
      .send({ billDate: 'first-of-month' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/billDate/);
  });

  it('allows a valid payload to pass through in enforce mode', async () => {
    const res = await request(app).post('/api/transactions').send({
      type: 'expense',
      amount: 100,
      date: '2026-05-01',
    });
    expect(res.status).toBe(201);
  });

  it('allows POST with unknown extra field (.unknown(true))', async () => {
    const res = await request(app).post('/api/transactions').send({
      type: 'expense',
      amount: 100,
      date: '2026-05-01',
      future: 'extra',
    });
    expect(res.status).toBe(201);
  });
});
