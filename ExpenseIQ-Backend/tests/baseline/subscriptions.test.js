const request = require('supertest');
const { setupTestDb } = require('../helpers/setup');
const { normalize } = require('../helpers/normalize');
const buildApp = require('../helpers/app');

setupTestDb();
const app = buildApp();

const sample = (over = {}) => ({
  profileId: 'default',
  name: 'Netflix',
  amount: 499,
  cycle: 'monthly',
  due: '2026-05-15',
  category: 'Entertainment',
  active: true,
  ...over,
});

describe('Subscriptions API', () => {
  it('GET empty list', async () => {
    const res = await request(app).get('/api/subscriptions');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('POST creates (201)', async () => {
    const res = await request(app).post('/api/subscriptions').send(sample());
    expect(res.status).toBe(201);
    expect(normalize(res.body)).toMatchSnapshot('create');
  });

  it('GET lists sorted by due asc', async () => {
    await request(app).post('/api/subscriptions').send(sample({ name: 'B', due: '2026-05-20' }));
    await request(app).post('/api/subscriptions').send(sample({ name: 'A', due: '2026-05-05' }));
    const res = await request(app).get('/api/subscriptions');
    expect(res.body.map((s) => s.name)).toEqual(['A', 'B']);
    expect(normalize(res.body)).toMatchSnapshot('list-sorted');
  });

  it('PUT updates', async () => {
    const created = await request(app).post('/api/subscriptions').send(sample());
    const res = await request(app)
      .put(`/api/subscriptions/${created.body._id}`)
      .send({ amount: 599, active: false });
    expect(res.status).toBe(200);
    expect(res.body.amount).toBe(599);
    expect(res.body.active).toBe(false);
    expect(normalize(res.body)).toMatchSnapshot('update');
  });

  it('PUT 404 on unknown id', async () => {
    const res = await request(app)
      .put('/api/subscriptions/507f1f77bcf86cd799439011')
      .send({ amount: 1 });
    expect(res.status).toBe(404);
  });

  it('DELETE removes', async () => {
    const created = await request(app).post('/api/subscriptions').send(sample());
    const res = await request(app).delete(`/api/subscriptions/${created.body._id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Deleted' });
  });

  it('DELETE 404 on unknown id', async () => {
    const res = await request(app).delete('/api/subscriptions/507f1f77bcf86cd799439011');
    expect(res.status).toBe(404);
  });
});
