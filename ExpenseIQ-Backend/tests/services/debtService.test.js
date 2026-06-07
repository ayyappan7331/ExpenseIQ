const { setupTestDb } = require('../helpers/setup');
const service = require('../../services/debtService');

setupTestDb();

const sample = (over = {}) => ({
  profileId: 'default',
  type: 'lent',
  person: 'Alice',
  amount: 500,
  date: '2026-05-10',
  ...over,
});

describe('debtService', () => {
  it('findAll returns [] when empty', async () => {
    expect(await service.findAll()).toEqual([]);
  });

  it('findAll sorts by createdAt desc', async () => {
    await service.create(sample({ person: 'A' }));
    await new Promise((r) => setTimeout(r, 5));
    await service.create(sample({ person: 'B' }));
    await new Promise((r) => setTimeout(r, 5));
    await service.create(sample({ person: 'C' }));
    const list = await service.findAll();
    expect(list.map((d) => d.person)).toEqual(['C', 'B', 'A']);
  });

  it('create persists with default settled=false', async () => {
    const debt = await service.create(sample());
    expect(debt.settled).toBe(false);
    expect(debt.settledDate).toBeNull();
  });

  it('update can mark settled', async () => {
    const created = await service.create(sample());
    const updated = await service.update(created._id, {
      settled: true,
      settledDate: '2026-05-20',
    });
    expect(updated.settled).toBe(true);
    expect(updated.settledDate).toBe('2026-05-20');
  });

  it('update throws httpError(404) for unknown id', async () => {
    await expect(
      service.update('507f1f77bcf86cd799439011', { settled: true })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('remove throws httpError(404) for unknown id', async () => {
    await expect(service.remove('507f1f77bcf86cd799439011')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
