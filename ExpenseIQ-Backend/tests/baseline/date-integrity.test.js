// Phase 6 contract — Transaction.date / Debt.date are now Date in MongoDB,
// but the wire format stays YYYY-MM-DD. Month filter uses a UTC range query.

const request = require('supertest');
const { setupTestDb } = require('../helpers/setup');
const buildApp = require('../helpers/app');
const Transaction = require('../../models/Transaction');
const Debt = require('../../models/Debt');

setupTestDb();
const app = buildApp();

describe('Date integrity: wire format', () => {
  it('Transaction.date round-trips as YYYY-MM-DD string', async () => {
    const res = await request(app).post('/api/transactions').send({
      type: 'expense',
      amount: 100,
      date: '2026-05-10',
    });
    expect(res.body.date).toBe('2026-05-10');
  });

  it('Debt.date round-trips as YYYY-MM-DD string', async () => {
    const res = await request(app).post('/api/debts').send({
      type: 'lent',
      person: 'Alice',
      amount: 1,
      date: '2026-05-10',
    });
    expect(res.body.date).toBe('2026-05-10');
  });

  it('underlying Transaction.date IS a real Date in MongoDB', async () => {
    await request(app).post('/api/transactions').send({
      type: 'expense',
      amount: 100,
      date: '2026-05-10',
    });
    const raw = await Transaction.findOne().lean();
    expect(raw.date).toBeInstanceOf(Date);
    expect(raw.date.toISOString()).toBe('2026-05-10T00:00:00.000Z');
  });

  it('underlying Debt.date IS a real Date in MongoDB', async () => {
    await request(app).post('/api/debts').send({
      type: 'lent',
      person: 'Alice',
      amount: 1,
      date: '2026-05-10',
    });
    const raw = await Debt.findOne().lean();
    expect(raw.date).toBeInstanceOf(Date);
    expect(raw.date.toISOString()).toBe('2026-05-10T00:00:00.000Z');
  });

  it('Debt.settledDate stays a string (Phase 6 left it alone by design)', async () => {
    const created = await request(app).post('/api/debts').send({
      type: 'lent',
      person: 'A',
      amount: 1,
      date: '2026-05-10',
    });
    await request(app).put(`/api/debts/${created.body._id}`).send({
      settled: true,
      settledDate: '2026-05-20',
    });
    const raw = await Debt.findOne().lean();
    expect(typeof raw.settledDate).toBe('string');
    expect(raw.settledDate).toBe('2026-05-20');
  });

  it('PUT updates emit YYYY-MM-DD as well', async () => {
    const created = await request(app).post('/api/transactions').send({
      type: 'expense',
      amount: 1,
      date: '2026-05-01',
    });
    const updated = await request(app)
      .put(`/api/transactions/${created.body._id}`)
      .send({ date: '2026-06-15' });
    expect(updated.body.date).toBe('2026-06-15');
  });

  it('bulk create preserves YYYY-MM-DD on every doc', async () => {
    const res = await request(app)
      .post('/api/transactions/bulk')
      .send([
        { type: 'expense', amount: 1, date: '2026-05-01' },
        { type: 'expense', amount: 2, date: '2026-05-15' },
      ]);
    expect(res.status).toBe(201);
    expect(res.body[0].date).toBe('2026-05-01');
    expect(res.body[1].date).toBe('2026-05-15');
  });
});

describe('Month-filter boundary cases', () => {
  beforeEach(async () => {
    await Promise.all([
      request(app).post('/api/transactions').send({ type: 'expense', amount: 1, date: '2026-04-30' }),
      request(app).post('/api/transactions').send({ type: 'expense', amount: 2, date: '2026-05-01' }),
      request(app).post('/api/transactions').send({ type: 'expense', amount: 3, date: '2026-05-15' }),
      request(app).post('/api/transactions').send({ type: 'expense', amount: 4, date: '2026-05-31' }),
      request(app).post('/api/transactions').send({ type: 'expense', amount: 5, date: '2026-06-01' }),
    ]);
  });

  it('includes the first day of the month (2026-05-01)', async () => {
    const res = await request(app).get('/api/transactions?month=2026-05');
    expect(res.body.find((t) => t.date === '2026-05-01')).toBeDefined();
  });

  it('includes the last day of the month (2026-05-31)', async () => {
    const res = await request(app).get('/api/transactions?month=2026-05');
    expect(res.body.find((t) => t.date === '2026-05-31')).toBeDefined();
  });

  it('excludes the previous month (2026-04-30)', async () => {
    const res = await request(app).get('/api/transactions?month=2026-05');
    expect(res.body.find((t) => t.date === '2026-04-30')).toBeUndefined();
  });

  it('excludes the next month (2026-06-01)', async () => {
    const res = await request(app).get('/api/transactions?month=2026-05');
    expect(res.body.find((t) => t.date === '2026-06-01')).toBeUndefined();
  });

  it('returns exactly the three May docs', async () => {
    const res = await request(app).get('/api/transactions?month=2026-05');
    expect(res.body.map((t) => t.date).sort()).toEqual(['2026-05-01', '2026-05-15', '2026-05-31']);
  });

  it('December → January year wrap: 2026-12 includes Dec 31, excludes Jan 1 of next year', async () => {
    await request(app).post('/api/transactions').send({ type: 'expense', amount: 99, date: '2026-12-31' });
    await request(app).post('/api/transactions').send({ type: 'expense', amount: 100, date: '2027-01-01' });
    const res = await request(app).get('/api/transactions?month=2026-12');
    expect(res.body.map((t) => t.date)).toEqual(['2026-12-31']);
  });

  it('malformed month returns [] (preserves old regex behavior)', async () => {
    const res = await request(app).get('/api/transactions?month=not-a-month');
    expect(res.body).toEqual([]);
  });
});
