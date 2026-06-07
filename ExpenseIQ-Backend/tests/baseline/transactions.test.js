const request = require('supertest');
const { setupTestDb } = require('../helpers/setup');
const { normalize } = require('../helpers/normalize');
const buildApp = require('../helpers/app');

setupTestDb();
const app = buildApp();

const sample = (over = {}) => ({
  profileId: 'default',
  type: 'expense',
  amount: 100,
  category: 'Food',
  source: 'Lunch',
  date: '2026-05-10',
  paymentMethod: 'card',
  notes: 'team lunch',
  ...over,
});

describe('Transactions API', () => {
  it('GET returns empty array initially', async () => {
    const res = await request(app).get('/api/transactions');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(normalize(res.body)).toMatchSnapshot();
  });

  it('POST creates a transaction (201) and GET lists it', async () => {
    const created = await request(app).post('/api/transactions').send(sample());
    expect(created.status).toBe(201);
    expect(normalize(created.body)).toMatchSnapshot('create');

    const list = await request(app).get('/api/transactions?profileId=default');
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(normalize(list.body)).toMatchSnapshot('list-after-create');
  });

  it('GET filters by month via date regex', async () => {
    await request(app).post('/api/transactions').send(sample({ date: '2026-05-01' }));
    await request(app).post('/api/transactions').send(sample({ date: '2026-06-15' }));

    const may = await request(app).get('/api/transactions?month=2026-05');
    expect(may.status).toBe(200);
    expect(may.body).toHaveLength(1);
    expect(may.body[0].date).toBe('2026-05-01');
  });

  it('PUT updates a transaction', async () => {
    const created = await request(app).post('/api/transactions').send(sample());
    const res = await request(app)
      .put(`/api/transactions/${created.body._id}`)
      .send({ amount: 250, notes: 'updated' });
    expect(res.status).toBe(200);
    expect(res.body.amount).toBe(250);
    expect(res.body.notes).toBe('updated');
    expect(normalize(res.body)).toMatchSnapshot('update');
  });

  it('PUT 404 on unknown id', async () => {
    const res = await request(app)
      .put('/api/transactions/507f1f77bcf86cd799439011')
      .send({ amount: 1 });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });

  it('DELETE removes a transaction', async () => {
    const created = await request(app).post('/api/transactions').send(sample());
    const res = await request(app).delete(`/api/transactions/${created.body._id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Deleted' });

    const list = await request(app).get('/api/transactions');
    expect(list.body).toHaveLength(0);
  });

  it('DELETE 404 on unknown id', async () => {
    const res = await request(app).delete('/api/transactions/507f1f77bcf86cd799439011');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });

  it('POST /bulk inserts many (201)', async () => {
    const res = await request(app)
      .post('/api/transactions/bulk')
      .send([sample({ amount: 1 }), sample({ amount: 2 }), sample({ amount: 3 })]);
    expect(res.status).toBe(201);
    expect(res.body).toHaveLength(3);
    expect(normalize(res.body)).toMatchSnapshot('bulk-create');
  });

  it('POST /bulk-delete removes by ids', async () => {
    const a = await request(app).post('/api/transactions').send(sample({ amount: 1 }));
    const b = await request(app).post('/api/transactions').send(sample({ amount: 2 }));
    const c = await request(app).post('/api/transactions').send(sample({ amount: 3 }));

    const res = await request(app)
      .post('/api/transactions/bulk-delete')
      .send({ ids: [a.body._id, b.body._id] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: '2 deleted' });

    const list = await request(app).get('/api/transactions');
    expect(list.body).toHaveLength(1);
    expect(list.body[0]._id).toBe(c.body._id);
  });

  it('POST /bulk-delete with no ids returns 400', async () => {
    const res = await request(app).post('/api/transactions/bulk-delete').send({ ids: [] });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'No IDs provided' });
  });

  it('POST without required fields returns 400', async () => {
    const res = await request(app).post('/api/transactions').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});
