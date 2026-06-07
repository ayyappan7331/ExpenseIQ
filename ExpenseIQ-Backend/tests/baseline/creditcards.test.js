const request = require('supertest');
const { setupTestDb } = require('../helpers/setup');
const { normalize } = require('../helpers/normalize');
const buildApp = require('../helpers/app');

setupTestDb();
const app = buildApp();

const sample = (over = {}) => ({
  profileId: 'default',
  name: 'HDFC',
  billDate: 1,
  dueDate: 15,
  limit: 100000,
  color: '#7c6ff7',
  linkedPaymentMethod: 'HDFC Credit Card',
  ...over,
});

describe('Credit Cards API', () => {
  it('GET empty list', async () => {
    const res = await request(app).get('/api/creditcards');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('POST creates (201)', async () => {
    const res = await request(app).post('/api/creditcards').send(sample());
    expect(res.status).toBe(201);
    expect(normalize(res.body)).toMatchSnapshot('create');
  });

  it('GET returns the card', async () => {
    await request(app).post('/api/creditcards').send(sample());
    const res = await request(app).get('/api/creditcards');
    expect(res.body).toHaveLength(1);
    expect(normalize(res.body)).toMatchSnapshot('list');
  });

  it('PUT updates', async () => {
    const created = await request(app).post('/api/creditcards').send(sample());
    const res = await request(app)
      .put(`/api/creditcards/${created.body._id}`)
      .send({ limit: 200000, color: '#000000' });
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(200000);
    expect(normalize(res.body)).toMatchSnapshot('update');
  });

  it('DELETE removes', async () => {
    const created = await request(app).post('/api/creditcards').send(sample());
    const res = await request(app).delete(`/api/creditcards/${created.body._id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Deleted' });
  });

  it('DELETE 404 on unknown id', async () => {
    const res = await request(app).delete('/api/creditcards/507f1f77bcf86cd799439011');
    expect(res.status).toBe(404);
  });

  it('POST stores linkedPaymentMethod', async () => {
    const res = await request(app)
      .post('/api/creditcards')
      .send(sample({ linkedPaymentMethod: 'Axis Ace' }));
    expect(res.status).toBe(201);
    expect(res.body.linkedPaymentMethod).toBe('Axis Ace');
  });

  it('POST rejects duplicate linkedPaymentMethod within same profile', async () => {
    await request(app).post('/api/creditcards').send(sample({ name: 'Card A' }));
    const res = await request(app)
      .post('/api/creditcards')
      .send(sample({ name: 'Card B' })); // same linkedPaymentMethod: 'HDFC Credit Card'
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already linked/i);
  });

  it('POST allows same linkedPaymentMethod for different profiles', async () => {
    await request(app).post('/api/creditcards').send(sample({ profileId: 'default' }));
    const res = await request(app)
      .post('/api/creditcards')
      .send(sample({ profileId: 'work' }));
    expect(res.status).toBe(201);
  });

  it('PUT rejects linking to a method already used by another card', async () => {
    const cardA = await request(app)
      .post('/api/creditcards')
      .send(sample({ name: 'Card A', linkedPaymentMethod: 'HDFC Credit Card' }));
    const cardB = await request(app)
      .post('/api/creditcards')
      .send(sample({ name: 'Card B', linkedPaymentMethod: 'Axis Ace' }));
    // Try to steal Card A's link
    const res = await request(app)
      .put(`/api/creditcards/${cardB.body._id}`)
      .send({ linkedPaymentMethod: 'HDFC Credit Card' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already linked/i);
  });

  it('PUT allows updating own linkedPaymentMethod to a new value', async () => {
    const created = await request(app).post('/api/creditcards').send(sample());
    const res = await request(app)
      .put(`/api/creditcards/${created.body._id}`)
      .send({ linkedPaymentMethod: 'HDFC Millennia' });
    expect(res.status).toBe(200);
    expect(res.body.linkedPaymentMethod).toBe('HDFC Millennia');
  });

  it('POST creates card without linkedPaymentMethod (legacy path)', async () => {
    const res = await request(app)
      .post('/api/creditcards')
      .send({ profileId: 'default', name: 'Legacy Card', billDate: 5, dueDate: 20 });
    expect(res.status).toBe(201);
    expect(res.body.linkedPaymentMethod).toBeUndefined();
  });

  it('POST allows multiple cards without linkedPaymentMethod (sparse index)', async () => {
    const r1 = await request(app)
      .post('/api/creditcards')
      .send({ profileId: 'default', name: 'Legacy A', billDate: 5, dueDate: 20 });
    const r2 = await request(app)
      .post('/api/creditcards')
      .send({ profileId: 'default', name: 'Legacy B', billDate: 10, dueDate: 25 });
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
  });
});
