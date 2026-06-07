// Phase 5 unit tests — call the service directly, no Express.

const { setupTestDb } = require('../helpers/setup');
const service = require('../../services/transactionService');

setupTestDb();

const sample = (over = {}) => ({
  profileId: 'default',
  type: 'expense',
  amount: 100,
  date: '2026-05-10',
  ...over,
});

describe('transactionService', () => {
  it('findAll returns [] when empty', async () => {
    expect(await service.findAll()).toEqual([]);
  });

  it('create persists and returns the document', async () => {
    const txn = await service.create(sample({ amount: 250 }));
    expect(txn._id).toBeDefined();
    expect(txn.amount).toBe(250);
  });

  it('findAll filters by month (UTC date-range on YYYY-MM)', async () => {
    await service.create(sample({ date: '2026-05-01' }));
    await service.create(sample({ date: '2026-06-15' }));
    const may = await service.findAll({ month: '2026-05' });
    expect(may).toHaveLength(1);
    // Service returns hydrated docs; the date field is a Date instance.
    // The wire format (string) is produced by the schema's toJSON transform.
    expect(may[0].toJSON().date).toBe('2026-05-01');
  });

  it('findAll sorts by date desc', async () => {
    await service.create(sample({ date: '2026-05-01', amount: 1 }));
    await service.create(sample({ date: '2026-05-10', amount: 2 }));
    await service.create(sample({ date: '2026-05-05', amount: 3 }));
    const list = await service.findAll();
    expect(list.map((t) => t.amount)).toEqual([2, 3, 1]);
  });

  it('update throws httpError(404) for unknown id', async () => {
    await expect(
      service.update('507f1f77bcf86cd799439011', { amount: 1 })
    ).rejects.toMatchObject({ statusCode: 404, message: 'Not found' });
  });

  it('remove throws httpError(404) for unknown id', async () => {
    await expect(service.remove('507f1f77bcf86cd799439011')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Not found',
    });
  });

  it('bulkCreate inserts many at once', async () => {
    const docs = await service.bulkCreate([sample({ amount: 1 }), sample({ amount: 2 })]);
    expect(docs).toHaveLength(2);
  });

  it('bulkDelete returns the deleted count', async () => {
    const a = await service.create(sample({ amount: 1 }));
    const b = await service.create(sample({ amount: 2 }));
    const count = await service.bulkDelete([a._id.toString(), b._id.toString()]);
    expect(count).toBe(2);
    expect(await service.findAll()).toEqual([]);
  });

  it('bulkDelete throws httpError(400) when ids is empty', async () => {
    await expect(service.bulkDelete([])).rejects.toMatchObject({
      statusCode: 400,
      message: 'No IDs provided',
    });
  });

  it('bulkDelete throws httpError(400) when ids is missing', async () => {
    await expect(service.bulkDelete(undefined)).rejects.toMatchObject({
      statusCode: 400,
      message: 'No IDs provided',
    });
  });
});
