// Phase 8 contract — /api/health pings Mongo (503 on failure), and a
// new /api/version endpoint surfaces app metadata.

const request = require('supertest');
const mongoose = require('mongoose');
const { setupTestDb } = require('../helpers/setup');
const buildApp = require('../helpers/app');

setupTestDb();
const app = buildApp();

describe('GET /api/health (deep ping)', () => {
  it('returns 200 ok + ISO timestamp when Mongo is reachable', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.timestamp).toBe('string');
  });

  it('returns 503 down when the Mongo ping rejects', async () => {
    const adminSpy = jest.spyOn(mongoose.connection.db, 'admin').mockReturnValueOnce({
      ping: () => Promise.reject(new Error('simulated mongo outage')),
    });
    try {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(503);
      expect(res.body.status).toBe('down');
      expect(typeof res.body.timestamp).toBe('string');
    } finally {
      adminSpy.mockRestore();
    }
  });

  it('happy-path body matches the Phase 0 snapshot shape exactly', async () => {
    // Important: this is the byte-compat guarantee. If anyone later adds a
    // new field to the healthy response, the Phase 0 health snapshot will
    // diff and this assertion will also fail.
    const res = await request(app).get('/api/health');
    expect(Object.keys(res.body).sort()).toEqual(['status', 'timestamp']);
  });
});

describe('GET /api/version', () => {
  it('returns { version, gitSha, nodeEnv }', async () => {
    const res = await request(app).get('/api/version');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        version: expect.any(String),
        gitSha: expect.any(String),
        nodeEnv: expect.any(String),
      })
    );
  });

  it('version matches package.json', async () => {
    // Read package.json relative to project root, not to this test file's CWD.
    // eslint-disable-next-line global-require
    const pkg = require('../../package.json');
    const res = await request(app).get('/api/version');
    expect(res.body.version).toBe(pkg.version);
  });

  it('nodeEnv reflects NODE_ENV (test in this environment)', async () => {
    const res = await request(app).get('/api/version');
    expect(res.body.nodeEnv).toBe('test');
  });

  it('gitSha falls back to "unknown" or the env override (never undefined)', async () => {
    const res = await request(app).get('/api/version');
    expect(typeof res.body.gitSha).toBe('string');
    expect(res.body.gitSha.length).toBeGreaterThan(0);
  });

  it('/api/version is public (works without an auth token even when AUTH_ENABLED=true)', async () => {
    const prev = process.env.AUTH_ENABLED;
    process.env.AUTH_ENABLED = 'true';
    process.env.JWT_SECRET = 'test-secret';
    try {
      const res = await request(app).get('/api/version');
      expect(res.status).toBe(200);
    } finally {
      if (prev === undefined) delete process.env.AUTH_ENABLED;
      else process.env.AUTH_ENABLED = prev;
    }
  });
});
