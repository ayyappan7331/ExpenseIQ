const mongoose = require('mongoose');
const { setupTestDb } = require('../helpers/setup');
const service = require('../../services/settingsService');

setupTestDb();

describe('settingsService', () => {
  it('get auto-creates default settings when none exist', async () => {
    const settings = await service.get();
    expect(settings.profileId).toBe('default');
    expect(settings.theme).toBe('light');
    expect(settings.widgets).toEqual(['chart', 'recent', 'goals']);
  });

  it('get returns the existing settings without re-creating', async () => {
    const first = await service.get();
    const again = await service.get();
    expect(first._id.toString()).toBe(again._id.toString());
  });

  it('update upserts settings (creates if missing)', async () => {
    const out = await service.update({ profileId: 'default', theme: 'dark' });
    expect(out.theme).toBe('dark');
  });

  it('navOrder round-trips through update → get', async () => {
    const order = ['/dashboard', '/transactions', '/analytics'];
    await service.update({ profileId: 'default', navOrder: order });
    const settings = await service.get({ profileId: 'default' });
    expect(settings.navOrder).toEqual(order);
  });

  it('navOrder persists independently of other fields', async () => {
    await service.update({ profileId: 'default', navOrder: ['/goals', '/budgets'] });
    await service.update({ profileId: 'default', theme: 'ocean' });
    const settings = await service.get({ profileId: 'default' });
    expect(settings.navOrder).toEqual(['/goals', '/budgets']);
    expect(settings.theme).toBe('ocean');
  });

  it('update keeps profileId-scoped (different profileIds = different docs)', async () => {
    await service.update({ profileId: 'work', theme: 'dark' });
    await service.update({ profileId: 'default', theme: 'light' });
    const work = await service.get({ profileId: 'work' });
    const def = await service.get({ profileId: 'default' });
    expect(work.theme).toBe('dark');
    expect(def.theme).toBe('light');
  });

  it('dbStats returns expected shape', async () => {
    const stats = await service.dbStats();
    expect(stats).toHaveProperty('dataSize');
    expect(stats).toHaveProperty('indexSize');
    expect(stats).toHaveProperty('storageSize');
    expect(stats).toHaveProperty('usedBytes');
    expect(stats).toHaveProperty('limitBytes', 512 * 1024 * 1024);
    expect(stats).toHaveProperty('collections');
    expect(stats).toHaveProperty('objects');
    expect(stats).toHaveProperty('db');
  });

  it('dbStats throws httpError(503) when DB is unavailable', async () => {
    // Temporarily mask the db getter so the early-return fires.
    const original = mongoose.connection.db;
    Object.defineProperty(mongoose.connection, 'db', {
      value: null,
      configurable: true,
    });
    try {
      await expect(service.dbStats()).rejects.toMatchObject({
        statusCode: 503,
        message: 'DB not connected',
      });
    } finally {
      Object.defineProperty(mongoose.connection, 'db', {
        value: original,
        configurable: true,
      });
    }
  });
});
