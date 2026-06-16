const mongoose = require('mongoose');
const { setupTestDb } = require('../helpers/setup');
const service = require('../../services/settingsService');

setupTestDb();

const uid1 = new mongoose.Types.ObjectId();
const uid2 = new mongoose.Types.ObjectId();

describe('settingsService', () => {
  it('get auto-creates default settings when none exist', async () => {
    const settings = await service.get({ userId: uid1 });
    expect(settings.userId.toString()).toBe(uid1.toString());
    expect(settings.theme).toBe('light');
    expect(settings.widgets).toEqual(['chart', 'recent', 'goals']);
  });

  it('get returns the existing settings without re-creating', async () => {
    const first = await service.get({ userId: uid1 });
    const again = await service.get({ userId: uid1 });
    expect(first._id.toString()).toBe(again._id.toString());
  });

  it('update upserts settings (creates if missing)', async () => {
    const out = await service.update({ userId: uid1, theme: 'dark' });
    expect(out.theme).toBe('dark');
  });

  it('navOrder round-trips through update → get', async () => {
    const order = ['/dashboard', '/transactions', '/analytics'];
    await service.update({ userId: uid1, navOrder: order });
    const settings = await service.get({ userId: uid1 });
    expect(settings.navOrder).toEqual(order);
  });

  it('navOrder persists independently of other fields', async () => {
    await service.update({ userId: uid1, navOrder: ['/goals', '/budgets'] });
    await service.update({ userId: uid1, theme: 'ocean' });
    const settings = await service.get({ userId: uid1 });
    expect(settings.navOrder).toEqual(['/goals', '/budgets']);
    expect(settings.theme).toBe('ocean');
  });

  it('update keeps userId-scoped (different userIds = different docs)', async () => {
    await service.update({ userId: uid1, theme: 'dark' });
    await service.update({ userId: uid2, theme: 'light' });
    const s1 = await service.get({ userId: uid1 });
    const s2 = await service.get({ userId: uid2 });
    expect(s1.theme).toBe('dark');
    expect(s2.theme).toBe('light');
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
