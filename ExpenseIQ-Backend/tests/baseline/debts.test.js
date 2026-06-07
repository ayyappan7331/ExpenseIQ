const request = require('supertest');
const { setupTestDb } = require('../helpers/setup');
const { normalize } = require('../helpers/normalize');
const buildApp = require('../helpers/app');

setupTestDb();
const app = buildApp();

const sample = (over = {}) => ({
  profileId: 'default',
  type: 'lent',
  person: 'Alice',
  amount: 500,
  note: 'movie tickets',
  date: '2026-05-10',
  settled: false,
  ...over,
});

describe('Debts API', () => {
  it('GET empty list', async () => {
    const res = await request(app).get('/api/debts');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('POST creates (201)', async () => {
    const res = await request(app).post('/api/debts').send(sample());
    expect(res.status).toBe(201);
    expect(normalize(res.body)).toMatchSnapshot('create');
  });

  it('GET returns documents for profile', async () => {
    await request(app).post('/api/debts').send(sample({ person: 'Alice' }));
    await request(app).post('/api/debts').send(sample({ person: 'Bob', type: 'borrowed' }));
    const res = await request(app).get('/api/debts');
    expect(res.body).toHaveLength(2);
    expect(normalize(res.body)).toMatchSnapshot('list');
  });

  it('PUT updates (mark settled)', async () => {
    const created = await request(app).post('/api/debts').send(sample());
    const res = await request(app)
      .put(`/api/debts/${created.body._id}`)
      .send({ settled: true, settledDate: '2026-05-20' });
    expect(res.status).toBe(200);
    expect(res.body.settled).toBe(true);
    expect(res.body.settledDate).toBe('2026-05-20');
    expect(normalize(res.body)).toMatchSnapshot('update');
  });

  it('DELETE removes', async () => {
    const created = await request(app).post('/api/debts').send(sample());
    const res = await request(app).delete(`/api/debts/${created.body._id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Deleted' });
  });

  it('DELETE 404 on unknown id', async () => {
    const res = await request(app).delete('/api/debts/507f1f77bcf86cd799439011');
    expect(res.status).toBe(404);
  });
});
