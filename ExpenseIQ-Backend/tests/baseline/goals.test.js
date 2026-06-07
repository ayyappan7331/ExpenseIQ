const request = require('supertest');
const { setupTestDb } = require('../helpers/setup');
const { normalize } = require('../helpers/normalize');
const buildApp = require('../helpers/app');

setupTestDb();
const app = buildApp();

describe('Goals API', () => {
  it('GET empty list', async () => {
    const res = await request(app).get('/api/goals');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('POST upserts (creates)', async () => {
    const res = await request(app)
      .post('/api/goals')
      .send({ profileId: 'default', month: '2026-05', amount: 10000 });
    expect(res.status).toBe(200);
    expect(res.body.amount).toBe(10000);
    expect(normalize(res.body)).toMatchSnapshot('create');
  });

  it('POST upserts (updates existing for same profile+month)', async () => {
    await request(app).post('/api/goals').send({ profileId: 'default', month: '2026-05', amount: 10000 });
    const res = await request(app)
      .post('/api/goals')
      .send({ profileId: 'default', month: '2026-05', amount: 15000 });
    expect(res.status).toBe(200);
    expect(res.body.amount).toBe(15000);

    const list = await request(app).get('/api/goals');
    expect(list.body).toHaveLength(1);
    expect(normalize(list.body)).toMatchSnapshot('list-after-upsert');
  });

  it('DELETE removes', async () => {
    const created = await request(app)
      .post('/api/goals')
      .send({ profileId: 'default', month: '2026-05', amount: 10000 });
    const res = await request(app).delete(`/api/goals/${created.body._id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Deleted' });
  });

  it('DELETE 404 on unknown id', async () => {
    const res = await request(app).delete('/api/goals/507f1f77bcf86cd799439011');
    expect(res.status).toBe(404);
  });
});
