// Phase 4 contract — helmet sets the expected hardening headers.

const request = require('supertest');
const { setupTestDb } = require('../helpers/setup');
const buildApp = require('../helpers/app');

setupTestDb();
const app = buildApp();

describe('Security: helmet headers', () => {
  it('sets X-Content-Type-Options: nosniff', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('removes X-Powered-By', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('sets X-Frame-Options', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  it('sets Cross-Origin-Resource-Policy: cross-origin (so a separate-port frontend can read responses)', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });

  it('sets a Referrer-Policy', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['referrer-policy']).toBeDefined();
  });

  it('does not break the existing health response body', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.timestamp).toBe('string');
  });
});
