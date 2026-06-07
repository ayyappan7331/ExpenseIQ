const request = require('supertest');
const { setupTestDb } = require('../helpers/setup');
const { normalize } = require('../helpers/normalize');
const buildApp = require('../helpers/app');

setupTestDb();
const app = buildApp();

describe('Profiles API', () => {
  it('GET auto-creates a default profile when none exist', async () => {
    const res = await request(app).get('/api/profiles');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      profileId: 'default',
      name: 'Personal',
      isDefault: true,
    });
    expect(normalize(res.body)).toMatchSnapshot('auto-default');
  });

  it('POST creates a new profile (201)', async () => {
    const res = await request(app)
      .post('/api/profiles')
      .send({ profileId: 'work', name: 'Work', icon: '💼', isDefault: false });
    expect(res.status).toBe(201);
    expect(normalize(res.body)).toMatchSnapshot('create');
  });

  it('GET sorts isDefault first', async () => {
    await request(app).get('/api/profiles'); // creates default
    await request(app).post('/api/profiles').send({ profileId: 'work', name: 'Work' });
    const res = await request(app).get('/api/profiles');
    expect(res.body[0].isDefault).toBe(true);
    expect(normalize(res.body)).toMatchSnapshot('list-sorted');
  });

  it('DELETE rejects deleting "default"', async () => {
    await request(app).get('/api/profiles'); // ensure default exists
    const res = await request(app).delete('/api/profiles/default');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Cannot delete default profile' });
  });

  it('DELETE 404 on unknown profileId', async () => {
    const res = await request(app).delete('/api/profiles/nonexistent');
    expect(res.status).toBe(404);
  });

  it('DELETE cascades across all child collections', async () => {
    // Set up a non-default profile with child data in every collection
    await request(app).post('/api/profiles').send({ profileId: 'work', name: 'Work' });

    await request(app).post('/api/transactions').send({
      profileId: 'work', type: 'expense', amount: 1, date: '2026-05-01',
    });
    await request(app).post('/api/subscriptions').send({
      profileId: 'work', name: 'X', amount: 1, due: '2026-05-01',
    });
    await request(app).post('/api/debts').send({
      profileId: 'work', type: 'lent', person: 'P', amount: 1, date: '2026-05-01',
    });
    await request(app).post('/api/goals').send({
      profileId: 'work', month: '2026-05', amount: 100,
    });
    await request(app).post('/api/creditcards').send({
      profileId: 'work', name: 'Card', billDate: 1, dueDate: 15,
    });
    await request(app).put('/api/settings').send({
      profileId: 'work', theme: 'dark',
    });
    await request(app).post('/api/budgets').send({
      profileId: 'work', month: '2026-05', category: 'Food', amount: 500,
    });

    // Sanity check: each collection has the work doc
    expect((await request(app).get('/api/transactions?profileId=work')).body).toHaveLength(1);
    expect((await request(app).get('/api/subscriptions?profileId=work')).body).toHaveLength(1);
    expect((await request(app).get('/api/debts?profileId=work')).body).toHaveLength(1);
    expect((await request(app).get('/api/goals?profileId=work')).body).toHaveLength(1);
    expect((await request(app).get('/api/creditcards?profileId=work')).body).toHaveLength(1);
    expect((await request(app).get('/api/budgets?profileId=work')).body).toHaveLength(1);

    // Delete the profile
    const del = await request(app).delete('/api/profiles/work');
    expect(del.status).toBe(200);
    expect(del.body).toEqual({ message: 'Deleted with cascade' });

    // Verify cascade removed everything
    expect((await request(app).get('/api/transactions?profileId=work')).body).toEqual([]);
    expect((await request(app).get('/api/subscriptions?profileId=work')).body).toEqual([]);
    expect((await request(app).get('/api/debts?profileId=work')).body).toEqual([]);
    expect((await request(app).get('/api/goals?profileId=work')).body).toEqual([]);
    expect((await request(app).get('/api/creditcards?profileId=work')).body).toEqual([]);
    expect((await request(app).get('/api/budgets?profileId=work')).body).toEqual([]);

    // Settings for "work" should also be gone (GET will lazily recreate one, so check via list)
    // (no list endpoint for settings — re-GET will auto-create; we verify behavior matches current)
    const settingsAfter = await request(app).get('/api/settings?profileId=work');
    expect(settingsAfter.status).toBe(200);
    expect(settingsAfter.body.profileId).toBe('work'); // re-created on GET — current behavior
  });
});
