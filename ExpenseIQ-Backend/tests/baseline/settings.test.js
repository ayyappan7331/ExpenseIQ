const request = require('supertest');
const { setupTestDb } = require('../helpers/setup');
const { normalize } = require('../helpers/normalize');
const buildApp = require('../helpers/app');

setupTestDb();
const app = buildApp();

describe('Settings API', () => {
  it('GET auto-creates default settings when none exist', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      profileId: 'default',
      theme: 'light',
      widgets: ['chart', 'recent', 'goals'],
      widgetOrder: [],
    });
    expect(normalize(res.body)).toMatchSnapshot('auto-create');
  });

  it('PUT upserts settings', async () => {
    const res = await request(app)
      .put('/api/settings')
      .send({ profileId: 'default', theme: 'dark', widgets: ['chart'], widgetOrder: ['chart'] });
    expect(res.status).toBe(200);
    expect(res.body.theme).toBe('dark');
    expect(res.body.widgets).toEqual(['chart']);
    expect(normalize(res.body)).toMatchSnapshot('update');
  });

  it('PUT then GET returns updated settings', async () => {
    await request(app).put('/api/settings').send({ profileId: 'default', theme: 'dark' });
    const res = await request(app).get('/api/settings');
    expect(res.body.theme).toBe('dark');
  });

  it('GET /db-stats returns usage shape', async () => {
    const res = await request(app).get('/api/settings/db-stats');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('dataSize');
    expect(res.body).toHaveProperty('indexSize');
    expect(res.body).toHaveProperty('storageSize');
    expect(res.body).toHaveProperty('usedBytes');
    expect(res.body).toHaveProperty('limitBytes', 512 * 1024 * 1024);
    expect(res.body).toHaveProperty('collections');
    expect(res.body).toHaveProperty('objects');
    expect(res.body).toHaveProperty('db');
  });
});
