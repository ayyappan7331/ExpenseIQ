import { transactionsToCSV } from '@/lib/utils/csv/export';
import { parseTransactionsCSV } from '@/lib/utils/csv/import';
import { isValidSubtype } from '@/lib/types/api';
import type { Transaction } from '@/lib/types/api';

const txns: Transaction[] = [
  { id: '1', profileId: 'default', type: 'expense', subtype: 'purchase', amount: 250, category: 'Food', subcategory: 'Groceries', date: '2026-05-10', time: '13:30', paymentMethod: 'UPI', paymentApp: 'GPay', notes: 'Lunch' },
  { id: '2', profileId: 'default', type: 'income', amount: 50000, category: 'Salary', date: '2026-05-01', notes: '' },
];

describe('transactionsToCSV', () => {
  it('generates CSV with header row including subtype column', () => {
    const csv = transactionsToCSV(txns);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('date,time,type,subtype,amount,category,subcategory,paymentMethod,paymentApp,notes');
    expect(lines[1]).toBe('2026-05-10,13:30,expense,purchase,250,Food,Groceries,UPI,GPay,Lunch');
    expect(lines[2]).toBe('2026-05-01,,income,,50000,Salary,,,,');
  });

  it('exports subtype correctly', () => {
    const csv = transactionsToCSV(txns);
    expect(csv).toContain('purchase');
  });

  it('exports subcategory correctly', () => {
    const csv = transactionsToCSV(txns);
    expect(csv).toContain('Groceries');
  });

  it('exports paymentApp correctly', () => {
    const csv = transactionsToCSV(txns);
    expect(csv).toContain('GPay');
  });

  it('escapes commas and quotes in fields', () => {
    const withComma: Transaction[] = [
      { id: '3', profileId: 'default', type: 'expense', amount: 100, category: 'Food, Drink', date: '2026-05-01', notes: 'He said "hi"' },
    ];
    const csv = transactionsToCSV(withComma);
    expect(csv).toContain('"Food, Drink"');
    expect(csv).toContain('"He said ""hi"""');
  });
});

describe('parseTransactionsCSV', () => {
  it('parses new 10-column format with subtype', () => {
    const csv = 'date,time,type,subtype,amount,category,subcategory,paymentMethod,paymentApp,notes\n2026-05-10,13:30,expense,purchase,250,Food,Groceries,UPI,GPay,Lunch\n2026-05-01,,income,payment,50000,Salary,,,,';
    const result = parseTransactionsCSV(csv, 'default');
    expect(result.valid.length).toBe(2);
    expect(result.errors.length).toBe(0);
    expect(result.valid[0].subtype).toBe('purchase');
    expect(result.valid[1].subtype).toBe('payment');
  });

  it('parses old 9-column format without subtype (backward compat)', () => {
    const csv = 'date,time,type,amount,category,subcategory,paymentMethod,paymentApp,notes\n2026-05-10,13:30,expense,250,Food,Groceries,UPI,GPay,Lunch\n2026-05-01,,income,50000,Salary,,,,';
    const result = parseTransactionsCSV(csv, 'default');
    expect(result.valid.length).toBe(2);
    expect(result.errors.length).toBe(0);
    expect(result.valid[0].subtype).toBeUndefined();
    expect(result.valid[0].subcategory).toBe('Groceries');
    expect(result.valid[0].time).toBe('13:30');
    expect(result.valid[0].paymentApp).toBe('GPay');
    expect(result.valid[1].time).toBeUndefined();
  });

  it('parses legacy 6-column format (backward compat)', () => {
    const csv = 'date,type,amount,category,paymentMethod,notes\n2026-05-10,expense,250,Food,UPI,Lunch\n2026-05-01,income,50000,Salary,,';
    const result = parseTransactionsCSV(csv, 'default');
    expect(result.valid.length).toBe(2);
    expect(result.errors.length).toBe(0);
    expect(result.valid[0].amount).toBe(250);
    expect(result.valid[0].type).toBe('expense');
    expect(result.valid[0].subtype).toBeUndefined();
    expect(result.valid[1].type).toBe('income');
  });

  it('silently ignores unknown subtype values', () => {
    const csv = 'date,time,type,subtype,amount,category,subcategory,paymentMethod,paymentApp,notes\n2026-05-10,,expense,unknown_type,250,Food,,,,';
    const result = parseTransactionsCSV(csv, 'default');
    expect(result.valid.length).toBe(1);
    expect(result.valid[0].subtype).toBeUndefined();
  });

  it('clears subtype when income + expense subtype (invalid combination)', () => {
    // income + purchase is invalid — subtype is cleared, row is still valid
    const csv = 'date,time,type,subtype,amount,category,subcategory,paymentMethod,paymentApp,notes\n2026-05-10,,income,purchase,250,Salary,,,,';
    const result = parseTransactionsCSV(csv, 'default');
    expect(result.valid.length).toBe(1);
    expect(result.valid[0].type).toBe('income');
    expect(result.valid[0].subtype).toBeUndefined();
  });

  it('clears subtype when expense + income subtype (invalid combination)', () => {
    // expense + cashback is invalid — subtype is cleared, row is still valid
    const csv = 'date,time,type,subtype,amount,category,subcategory,paymentMethod,paymentApp,notes\n2026-05-10,,expense,cashback,250,Food,,,,';
    const result = parseTransactionsCSV(csv, 'default');
    expect(result.valid.length).toBe(1);
    expect(result.valid[0].type).toBe('expense');
    expect(result.valid[0].subtype).toBeUndefined();
  });

  it('keeps valid income + payment combination', () => {
    const csv = 'date,time,type,subtype,amount,category,subcategory,paymentMethod,paymentApp,notes\n2026-05-10,,income,payment,250,Salary,,,,';
    const result = parseTransactionsCSV(csv, 'default');
    expect(result.valid[0].subtype).toBe('payment');
  });

  it('keeps valid expense + purchase combination', () => {
    const csv = 'date,time,type,subtype,amount,category,subcategory,paymentMethod,paymentApp,notes\n2026-05-10,,expense,purchase,250,Food,,,,';
    const result = parseTransactionsCSV(csv, 'default');
    expect(result.valid[0].subtype).toBe('purchase');
  });

  it('parses CSV without header', () => {
    const csv = '2026-05-10,expense,250,Food,UPI,Lunch';
    const result = parseTransactionsCSV(csv, 'default');
    expect(result.valid.length).toBe(1);
  });

  it('reports errors for invalid rows', () => {
    const csv = 'date,type,amount\n2026-05-10,expense,250\nbad-date,expense,100\n2026-05-10,invalid,100\n2026-05-10,expense,-5';
    const result = parseTransactionsCSV(csv, 'default');
    expect(result.valid.length).toBe(1);
    expect(result.errors.length).toBe(3);
    expect(result.errors[0].message).toContain('Invalid date');
    expect(result.errors[1].message).toContain('Invalid type');
    expect(result.errors[2].message).toContain('Invalid amount');
  });

  it('handles empty file', () => {
    const result = parseTransactionsCSV('', 'default');
    expect(result.valid.length).toBe(0);
    expect(result.errors[0].message).toBe('Empty file');
  });

  it('handles quoted fields with commas', () => {
    const csv = 'date,time,type,subtype,amount,category,subcategory,paymentMethod,paymentApp,notes\n2026-05-10,,expense,,250,"Food, Drink",,UPI,,"Had a ""great"" time"';
    const result = parseTransactionsCSV(csv, 'default');
    expect(result.valid.length).toBe(1);
    expect(result.valid[0].category).toBe('Food, Drink');
    expect(result.valid[0].notes).toBe('Had a "great" time');
  });

  it('assigns profileId to all valid rows', () => {
    const csv = '2026-05-10,expense,250,Food,,';
    const result = parseTransactionsCSV(csv, 'work');
    expect(result.valid[0].profileId).toBe('work');
  });
});

// ── isValidSubtype ─────────────────────────────────────────────────────────────

describe('isValidSubtype', () => {
  // Valid income combinations
  it('income + payment is valid', () => expect(isValidSubtype('income', 'payment')).toBe(true));
  it('income + refund is valid', () => expect(isValidSubtype('income', 'refund')).toBe(true));
  it('income + cashback is valid', () => expect(isValidSubtype('income', 'cashback')).toBe(true));
  it('income + reimbursement is valid', () => expect(isValidSubtype('income', 'reimbursement')).toBe(true));
  it('income + transfer_in is valid', () => expect(isValidSubtype('income', 'transfer_in')).toBe(true));
  it('income + other is valid', () => expect(isValidSubtype('income', 'other')).toBe(true));

  // Valid expense combinations
  it('expense + purchase is valid', () => expect(isValidSubtype('expense', 'purchase')).toBe(true));
  it('expense + fee is valid', () => expect(isValidSubtype('expense', 'fee')).toBe(true));
  it('expense + interest is valid', () => expect(isValidSubtype('expense', 'interest')).toBe(true));
  it('expense + transfer_out is valid', () => expect(isValidSubtype('expense', 'transfer_out')).toBe(true));
  it('expense + emi is valid', () => expect(isValidSubtype('expense', 'emi')).toBe(true));
  it('expense + other is valid', () => expect(isValidSubtype('expense', 'other')).toBe(true));

  // Invalid cross-type combinations
  it('income + purchase is invalid', () => expect(isValidSubtype('income', 'purchase')).toBe(false));
  it('income + emi is invalid', () => expect(isValidSubtype('income', 'emi')).toBe(false));
  it('income + fee is invalid', () => expect(isValidSubtype('income', 'fee')).toBe(false));
  it('income + interest is invalid', () => expect(isValidSubtype('income', 'interest')).toBe(false));
  it('income + transfer_out is invalid', () => expect(isValidSubtype('income', 'transfer_out')).toBe(false));
  it('expense + cashback is invalid', () => expect(isValidSubtype('expense', 'cashback')).toBe(false));
  it('expense + reimbursement is invalid', () => expect(isValidSubtype('expense', 'reimbursement')).toBe(false));
  it('expense + payment is invalid', () => expect(isValidSubtype('expense', 'payment')).toBe(false));
  it('expense + transfer_in is invalid', () => expect(isValidSubtype('expense', 'transfer_in')).toBe(false));

  // Absent subtype is always valid
  it('undefined subtype is valid for income', () => expect(isValidSubtype('income', undefined)).toBe(true));
  it('undefined subtype is valid for expense', () => expect(isValidSubtype('expense', undefined)).toBe(true));
  it('empty string subtype is valid', () => expect(isValidSubtype('income', '')).toBe(true));
});
