const request = require('supertest');
const { setupTestDb } = require('../helpers/setup');
const { normalize } = require('../helpers/normalize');
const buildApp = require('../helpers/app');

setupTestDb();
const app = buildApp();

describe('Budgets API', () => {
  it('GET empty list', async () => {
    const res = await request(app).get('/api/budgets');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('POST upserts (creates)', async () => {
    const res = await request(app)
      .post('/api/budgets')
      .send({ profileId: 'default', month: '2026-05', category: 'Food', amount: 5000 });
    expect(res.status).toBe(200);
    expect(res.body.amount).toBe(5000);
    expect(normalize(res.body)).toMatchSnapshot('create');
  });

  it('POST upserts (updates existing same profile+month+category)', async () => {
    await request(app).post('/api/budgets').send({
      profileId: 'default', month: '2026-05', category: 'Food', amount: 5000,
    });
    const res = await request(app).post('/api/budgets').send({
      profileId: 'default', month: '2026-05', category: 'Food', amount: 7000,
    });
    expect(res.status).toBe(200);
    expect(res.body.amount).toBe(7000);

    const list = await request(app).get('/api/budgets');
    expect(list.body).toHaveLength(1);
  });

  it('POST without required fields returns 400', async () => {
    const res = await request(app).post('/api/budgets').send({ profileId: 'default' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'month, category, and amount are required' });
  });

  it('GET filters by month', async () => {
    await request(app).post('/api/budgets').send({
      profileId: 'default', month: '2026-05', category: 'Food', amount: 5000,
    });
    await request(app).post('/api/budgets').send({
      profileId: 'default', month: '2026-06', category: 'Food', amount: 6000,
    });
    const res = await request(app).get('/api/budgets?month=2026-05');
    expect(res.body).toHaveLength(1);
    expect(res.body[0].month).toBe('2026-05');
    expect(normalize(res.body)).toMatchSnapshot('list-filtered');
  });

  it('DELETE removes', async () => {
    const created = await request(app).post('/api/budgets').send({
      profileId: 'default', month: '2026-05', category: 'Food', amount: 5000,
    });
    const res = await request(app).delete(`/api/budgets/${created.body._id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Deleted' });
  });

  it('DELETE 404 on unknown id', async () => {
    const res = await request(app).delete('/api/budgets/507f1f77bcf86cd799439011');
    expect(res.status).toBe(404);
  });
});
