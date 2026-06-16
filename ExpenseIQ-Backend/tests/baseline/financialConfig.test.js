const request = require('supertest');
const { setupTestDb } = require('../helpers/setup');
const { normalize } = require('../helpers/normalize');
const buildApp = require('../helpers/app');

setupTestDb();
const app = buildApp();

describe('FinancialConfig API', () => {
  it('GET auto-creates default config when none exists', async () => {
    const res = await request(app).get('/api/financial-config');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      customExpenseCategories: [],
      customIncomeCategories: [],
      customPaymentMethods: [],
    });
  });

  it('PUT upserts financial config', async () => {
    const res = await request(app)
      .put('/api/financial-config')
      .send({
        profileId: 'default',
        customExpenseCategories: ['Food', 'Transport'],
        customPaymentMethods: ['Cash', 'UPI'],
      });
    expect(res.status).toBe(200);
    expect(res.body.customExpenseCategories).toEqual(['Food', 'Transport']);
    expect(res.body.customPaymentMethods).toEqual(['Cash', 'UPI']);
    expect(normalize(res.body)).toMatchSnapshot('update');
  });

  it('PUT then GET returns updated config', async () => {
    await request(app)
      .put('/api/financial-config')
      .send({ profileId: 'default', customExpenseCategories: ['Food'] });
    const res = await request(app).get('/api/financial-config');
    expect(res.body.customExpenseCategories).toEqual(['Food']);
  });

  it('PUT only updates provided fields', async () => {
    await request(app)
      .put('/api/financial-config')
      .send({ profileId: 'default', customExpenseCategories: ['Food'] });
    await request(app)
      .put('/api/financial-config')
      .send({ profileId: 'default', customPaymentMethods: ['UPI'] });
    const res = await request(app).get('/api/financial-config');
    expect(res.body.customExpenseCategories).toEqual(['Food']);
    expect(res.body.customPaymentMethods).toEqual(['UPI']);
  });

  // Note: profile-scoped test removed — config is now userId-scoped via JWT,
  // not profileId-scoped. All requests in this test run share the same stub userId.

  it('PATCH partially updates financial config', async () => {
    await request(app)
      .put('/api/financial-config')
      .send({ profileId: 'default', customExpenseCategories: ['Food'], customPaymentMethods: ['Cash'] });
    const res = await request(app)
      .patch('/api/financial-config')
      .send({ profileId: 'default', customPaymentMethods: ['UPI', 'Card'] });
    expect(res.status).toBe(200);
    // PATCH only touched customPaymentMethods — customExpenseCategories preserved
    expect(res.body.customExpenseCategories).toEqual(['Food']);
    expect(res.body.customPaymentMethods).toEqual(['UPI', 'Card']);
  });

  it('PATCH upserts when no config exists', async () => {
    const res = await request(app)
      .patch('/api/financial-config')
      .send({ profileId: 'patch-new', customExpenseCategories: ['Rent'] });
    expect(res.status).toBe(200);
    expect(res.body.customExpenseCategories).toEqual(['Rent']);
    expect(res.body.customPaymentMethods).toEqual([]);
  });

  it('PATCH stores and retrieves transactionTemplates', async () => {
    const template = {
      id: 'tpl-1',
      name: 'Grocery Run',
      type: 'expense',
      category: 'Food',
      subcategory: 'Groceries',
      paymentMethod: 'Cash',
      createdAt: new Date().toISOString(),
    };
    const res = await request(app)
      .patch('/api/financial-config')
      .send({ profileId: 'default', transactionTemplates: [template] });
    expect(res.status).toBe(200);
    expect(res.body.transactionTemplates).toHaveLength(1);
    expect(res.body.transactionTemplates[0].name).toBe('Grocery Run');
  });

  it('PATCH replaces transactionTemplates array atomically', async () => {
    const t1 = { id: 'a', name: 'T1', type: 'expense', category: 'Food', createdAt: new Date().toISOString() };
    const t2 = { id: 'b', name: 'T2', type: 'income', category: 'Salary', createdAt: new Date().toISOString() };
    await request(app).patch('/api/financial-config').send({ profileId: 'default', transactionTemplates: [t1] });
    const res = await request(app).patch('/api/financial-config').send({ profileId: 'default', transactionTemplates: [t1, t2] });
    expect(res.body.transactionTemplates).toHaveLength(2);
  });

  it('PATCH stores and retrieves favoriteTransactions', async () => {
    const fav = {
      id: 'fav-1', name: 'Groceries', type: 'expense', category: 'Food',
      paymentMethod: 'Cash', createdAt: new Date().toISOString(), usageCount: 3, lastUsed: new Date().toISOString(),
    };
    const res = await request(app)
      .patch('/api/financial-config')
      .send({ profileId: 'default', favoriteTransactions: [fav] });
    expect(res.status).toBe(200);
    expect(res.body.favoriteTransactions).toHaveLength(1);
    expect(res.body.favoriteTransactions[0].name).toBe('Groceries');
    expect(res.body.favoriteTransactions[0].usageCount).toBe(3);
  });

  it('PATCH stores and retrieves pinnedTransactionIds', async () => {
    const res = await request(app)
      .patch('/api/financial-config')
      .send({ profileId: 'default', pinnedTransactionIds: ['txn-1', 'txn-2'] });
    expect(res.status).toBe(200);
    expect(res.body.pinnedTransactionIds).toEqual(['txn-1', 'txn-2']);
  });

  it('PATCH updates pinnedTransactionIds without touching other fields', async () => {
    await request(app).patch('/api/financial-config').send({ profileId: 'default', customExpenseCategories: ['Food'] });
    const res = await request(app).patch('/api/financial-config').send({ profileId: 'default', pinnedTransactionIds: ['txn-3'] });
    expect(res.body.customExpenseCategories).toEqual(['Food']);
    expect(res.body.pinnedTransactionIds).toEqual(['txn-3']);
  });
});
