import { describe, it, expect } from 'vitest';
import { buildCardMethodMap, computeCardStats, computeUtilization, computeBillingCycle, computePaymentStatus, daysUntil } from './helpers';
import type { Transaction, CreditCard } from '@/lib/types/api';

const makeTxn = (overrides: Partial<Transaction>): Transaction => ({
  id: 'x',
  context: 'default',
  type: 'expense',
  amount: 100,
  date: '2026-05-10',
  ...overrides,
});

const makeCard = (overrides: Partial<CreditCard>): CreditCard => ({
  id: 'c1',
  context: 'default',
  name: 'HDFC Credit Card',
  billDate: 19,
  duePeriod: 20,
  ...overrides,
});

// ── buildCardMethodMap ────────────────────────────────────────────────────

describe('buildCardMethodMap', () => {
  it('uses linkedPaymentMethod as the primary key', () => {
    const cards = [makeCard({ linkedPaymentMethod: 'HDFC Credit Card' })];
    const map = buildCardMethodMap(['HDFC Credit Card', 'GPay'], cards);
    expect(map.has('HDFC Credit Card')).toBe(true);
    expect(map.get('HDFC Credit Card')?.id).toBe('c1');
    expect(map.has('GPay')).toBe(false);
  });

  it('falls back to regex for methods without a linked card', () => {
    const map = buildCardMethodMap(['Amazon Pay Credit Card', 'GPay'], []);
    expect(map.has('Amazon Pay Credit Card')).toBe(true);
    expect(map.has('GPay')).toBe(false);
  });

  it('regex fallback attaches matching card by name', () => {
    const card = makeCard({ name: 'Amazon Pay Credit Card', linkedPaymentMethod: undefined });
    const map = buildCardMethodMap(['Amazon Pay Credit Card'], [card]);
    expect(map.get('Amazon Pay Credit Card')?.id).toBe('c1');
  });

  it('explicit link takes priority over regex', () => {
    const card = makeCard({ name: 'Amex Platinum', linkedPaymentMethod: 'Amex Platinum' });
    const map = buildCardMethodMap(['Amex Platinum'], [card]);
    expect(map.has('Amex Platinum')).toBe(true);
    expect(map.get('Amex Platinum')?.id).toBe('c1');
  });

  it('non-credit-card methods without explicit link are excluded', () => {
    const map = buildCardMethodMap(['GPay', 'Cash', 'UPI'], []);
    expect(map.size).toBe(0);
  });

  it('card with linkedPaymentMethod that differs from name is tracked correctly', () => {
    const card = makeCard({ name: 'HDFC Credit Card', linkedPaymentMethod: 'HDFC Millennia' });
    const map = buildCardMethodMap(['HDFC Millennia', 'GPay'], [card]);
    expect(map.has('HDFC Millennia')).toBe(true);
    expect(map.has('HDFC Credit Card')).toBe(false);
  });
});

// ── computeCardStats ──────────────────────────────────────────────────────

describe('computeCardStats', () => {
  const txns: Transaction[] = [
    makeTxn({ id: '1', amount: 500, date: '2026-05-10', paymentMethod: 'HDFC Credit Card' }),
    makeTxn({ id: '2', amount: 300, date: '2026-05-15', paymentMethod: 'HDFC Credit Card' }),
    makeTxn({ id: '3', amount: 200, date: '2026-04-20', paymentMethod: 'HDFC Credit Card' }),
    makeTxn({ id: '4', amount: 1000, date: '2026-01-05', paymentMethod: 'HDFC Credit Card' }),
    makeTxn({ id: '5', amount: 400, date: '2026-05-12', paymentMethod: 'Amazon Pay Credit Card' }),
    // income on the card = payment/refund, reduces outstanding
    makeTxn({ id: '6', type: 'income', amount: 500, date: '2026-05-20', paymentMethod: 'HDFC Credit Card' }),
  ];

  const hdfcCard = makeCard({ linkedPaymentMethod: 'HDFC Credit Card' });
  const cardMethodMap = new Map([['HDFC Credit Card', hdfcCard as CreditCard | undefined]]);

  it('computes monthly spend correctly (expenses only)', () => {
    const [hdfc] = computeCardStats(cardMethodMap, txns, '2026-05', '2026');
    expect(hdfc.monthlySpend).toBe(800); // 500 + 300
  });

  it('computes yearly spend correctly (expenses only)', () => {
    const [hdfc] = computeCardStats(cardMethodMap, txns, '2026-05', '2026');
    expect(hdfc.yearlySpend).toBe(2000); // 500+300+200+1000
  });

  it('computes lifetime spend correctly (expenses only)', () => {
    const [hdfc] = computeCardStats(cardMethodMap, txns, '2026-05', '2026');
    expect(hdfc.lifetimeSpend).toBe(2000);
  });

  it('counts only expense transactions', () => {
    const [hdfc] = computeCardStats(cardMethodMap, txns, '2026-05', '2026');
    expect(hdfc.txnCount).toBe(4); // 4 expense txns, income excluded
  });

  it('backward compat: undefined subtype income reduces outstanding', () => {
    const [hdfc] = computeCardStats(cardMethodMap, txns, '2026-05', '2026');
    expect(hdfc.outstandingBalance).toBe(1500); // 2000 - 500
  });

  it('outstanding balance floors at 0 when payments exceed expenses', () => {
    const overpaidTxns: Transaction[] = [
      makeTxn({ id: 'a', amount: 100, date: '2026-05-01', paymentMethod: 'HDFC Credit Card' }),
      makeTxn({ id: 'b', type: 'income', amount: 500, date: '2026-05-02', paymentMethod: 'HDFC Credit Card' }),
    ];
    const [hdfc] = computeCardStats(cardMethodMap, overpaidTxns, '2026-05', '2026');
    expect(hdfc.outstandingBalance).toBe(0);
  });

  it('outstanding balance is 0 when no transactions', () => {
    const emptyMap = new Map([['HDFC Credit Card', hdfcCard as CreditCard | undefined]]);
    const [hdfc] = computeCardStats(emptyMap, [], '2026-05', '2026');
    expect(hdfc.outstandingBalance).toBe(0);
  });

  it('returns last transaction date (from expenses only)', () => {
    const [hdfc] = computeCardStats(cardMethodMap, txns, '2026-05', '2026');
    expect(hdfc.lastTxnDate).toBe('2026-05-15');
  });

  it('attaches metadata when available', () => {
    const [hdfc] = computeCardStats(cardMethodMap, txns, '2026-05', '2026');
    expect(hdfc.meta?.billDate).toBe(19);
  });

  it('returns null lastTxnDate for card with no transactions', () => {
    const emptyMap = new Map([['Amazon Pay Credit Card', undefined as CreditCard | undefined]]);
    const [amazon] = computeCardStats(emptyMap, [], '2026-05', '2026');
    expect(amazon.lastTxnDate).toBeNull();
  });

  it('handles case-insensitive paymentMethod matching', () => {
    const txnsLower: Transaction[] = [
      makeTxn({ id: '7', amount: 100, date: '2026-05-01', paymentMethod: 'hdfc credit card' }),
    ];
    const [hdfc] = computeCardStats(cardMethodMap, txnsLower, '2026-05', '2026');
    expect(hdfc.monthlySpend).toBe(100);
  });

  it('returns null cycle fields when card has no billDate', () => {
    const noDateCard = makeCard({ billDate: undefined as unknown as number, dueDate: undefined as unknown as number });
    const map = new Map([['HDFC Credit Card', noDateCard as CreditCard | undefined]]);
    const [hdfc] = computeCardStats(map, [], '2026-05', '2026');
    expect(hdfc.cycleStart).toBeNull();
    expect(hdfc.cycleEnd).toBeNull();
    expect(hdfc.nextDueDate).toBeNull();
    expect(hdfc.statementBalance).toBe(0);
  });
});

// ── daysUntil ─────────────────────────────────────────────────────────────

describe('daysUntil', () => {
  it('returns a positive number', () => {
    expect(daysUntil(15)).toBeGreaterThan(0);
  });
});

// ── computeUtilization ────────────────────────────────────────────────────

describe('computeUtilization', () => {
  it('returns null when limit is undefined', () => {
    expect(computeUtilization(5000, undefined)).toBeNull();
  });

  it('returns null when limit is 0', () => {
    expect(computeUtilization(5000, 0)).toBeNull();
  });

  it('returns 0% for zero outstanding', () => {
    const result = computeUtilization(0, 100000);
    expect(result?.pct).toBe(0);
    expect(result?.barPct).toBe(0);
    expect(result?.band).toBe('healthy');
  });

  it('healthy band: pct < 30', () => {
    const result = computeUtilization(15000, 100000);
    expect(result?.pct).toBe(15);
    expect(result?.band).toBe('healthy');
  });

  it('moderate band: 30 <= pct < 50', () => {
    expect(computeUtilization(40000, 100000)?.band).toBe('moderate');
  });

  it('high band: 50 <= pct < 75', () => {
    expect(computeUtilization(60000, 100000)?.band).toBe('high');
  });

  it('critical band: pct >= 75', () => {
    expect(computeUtilization(80000, 100000)?.band).toBe('critical');
  });

  it('barPct clamps at 100 when outstanding exceeds limit', () => {
    const result = computeUtilization(120000, 100000);
    expect(result?.pct).toBeCloseTo(120);
    expect(result?.barPct).toBe(100);
    expect(result?.band).toBe('critical');
  });

  it('exact 30% boundary is moderate', () => {
    expect(computeUtilization(30000, 100000)?.band).toBe('moderate');
  });

  it('exact 50% boundary is high', () => {
    expect(computeUtilization(50000, 100000)?.band).toBe('high');
  });

  it('exact 75% boundary is critical', () => {
    expect(computeUtilization(75000, 100000)?.band).toBe('critical');
  });
});

// ── computeBillingCycle ───────────────────────────────────────────────────

describe('computeBillingCycle', () => {
  it('returns null when billDate is missing', () => {
    expect(computeBillingCycle(undefined, 8)).toBeNull();
  });

  it('returns null when dueDate is missing', () => {
    expect(computeBillingCycle(15, undefined)).toBeNull();
  });

  it('today after billDate: cycle ends this month', () => {
    const today = new Date(2026, 5, 20);
    const result = computeBillingCycle(15, 8, today, true);
    expect(result?.cycleStart).toBe('2026-05-16');
    expect(result?.cycleEnd).toBe('2026-06-15');
  });

  it('today before billDate: cycle ends last month', () => {
    const today = new Date(2026, 5, 10);
    const result = computeBillingCycle(15, 8, today, true);
    expect(result?.cycleStart).toBe('2026-04-16');
    expect(result?.cycleEnd).toBe('2026-05-15');
  });

  it('today exactly on billDate: cycle ends this month', () => {
    const today = new Date(2026, 5, 15);
    const result = computeBillingCycle(15, 8, today, true);
    expect(result?.cycleStart).toBe('2026-05-16');
    expect(result?.cycleEnd).toBe('2026-06-15');
  });

  it('handles year boundary: billDate=15, today=Jan 10', () => {
    const today = new Date(2026, 0, 10);
    const result = computeBillingCycle(15, 8, today, true);
    expect(result?.cycleStart).toBe('2025-11-16');
    expect(result?.cycleEnd).toBe('2025-12-15');
  });

  it('handles year boundary: billDate=15, today=Jan 20', () => {
    const today = new Date(2026, 0, 20);
    const result = computeBillingCycle(15, 8, today, true);
    expect(result?.cycleStart).toBe('2025-12-16');
    expect(result?.cycleEnd).toBe('2026-01-15');
  });

  it('nextDueDate is next month when dueDate falls before cycleEnd', () => {
    const today = new Date(2026, 5, 20);
    const result = computeBillingCycle(15, 8, today, true);
    expect(result?.nextDueDate).toBe('2026-07-08');
  });

  it('nextDueDate same month when dueDate falls after cycleEnd', () => {
    const today = new Date(2026, 5, 10);
    const result = computeBillingCycle(5, 25, today, true);
    expect(result?.cycleEnd).toBe('2026-06-05');
    expect(result?.nextDueDate).toBe('2026-06-25');
  });

  it('cycle transaction filtering uses string comparison correctly', () => {
    const today = new Date(2026, 5, 20);
    const cycle = computeBillingCycle(15, 8, today, true)!;
    const txns = [
      makeTxn({ id: '1', amount: 1000, date: '2026-05-20' }), // in cycle
      makeTxn({ id: '2', amount: 500, date: '2026-06-10' }),  // in cycle
      makeTxn({ id: '3', amount: 200, date: '2026-04-10' }),  // before cycle
      makeTxn({ id: '4', amount: 300, date: '2026-06-16' }),  // after cycle
    ];
    const inCycle = txns.filter((t) => t.date >= cycle.cycleStart && t.date <= cycle.cycleEnd);
    expect(inCycle).toHaveLength(2);
    expect(inCycle.reduce((s, t) => s + t.amount, 0)).toBe(1500);
  });

  it('billDate=31 in February: today before clamped date, cycle ends in January', () => {
    const today = new Date(2026, 1, 20);
    const result = computeBillingCycle(31, 8, today, true);
    expect(result?.cycleEnd).toBe('2026-01-31');
    expect(result?.cycleStart).toBe('2026-01-01');
  });

  it('billDate=31 in February: today on or after clamped date, cycle ends in February', () => {
    const today = new Date(2026, 1, 28);
    const result = computeBillingCycle(31, 8, today, true);
    expect(result?.cycleEnd).toBe('2026-02-28');
  });

  it('billDate=31 in leap year February: today on clamped date, cycle ends Feb 29', () => {
    const today = new Date(2028, 1, 29);
    const result = computeBillingCycle(31, 8, today, true);
    expect(result?.cycleEnd).toBe('2028-02-29');
  });

  it('billDate=31 in April: today before clamped date, cycle ends in March', () => {
    const today = new Date(2026, 3, 20);
    const result = computeBillingCycle(31, 8, today, true);
    expect(result?.cycleEnd).toBe('2026-03-31');
  });

  it('billDate=31 in April: today on clamped date, cycle ends Apr 30', () => {
    const today = new Date(2026, 3, 30);
    const result = computeBillingCycle(31, 8, today, true);
    expect(result?.cycleEnd).toBe('2026-04-30');
  });

  it('billDate=31 in a 31-day month: no clamping needed', () => {
    const today = new Date(2026, 0, 31);
    const result = computeBillingCycle(31, 8, today, true);
    expect(result?.cycleEnd).toBe('2026-01-31');
  });

  it('cycleStart is correct when billDate=31 and previous month is February', () => {
    const today = new Date(2026, 2, 31);
    const result = computeBillingCycle(31, 8, today, true);
    expect(result?.cycleEnd).toBe('2026-03-31');
    expect(result?.cycleStart).toBe('2026-03-01');
  });

  it('dueDate=31 in April: nextDueDate clamps to Apr 30', () => {
    const today = new Date(2026, 3, 10);
    const result = computeBillingCycle(5, 31, today, true);
    expect(result?.cycleEnd).toBe('2026-04-05');
    expect(result?.nextDueDate).toBe('2026-04-30');
  });

  it('dueDate=31 in February: nextDueDate clamps to Feb 28', () => {
    const today = new Date(2026, 2, 10);
    const result = computeBillingCycle(25, 31, today, true);
    expect(result?.cycleEnd).toBe('2026-02-25');
    expect(result?.nextDueDate).toBe('2026-02-28');
  });

  it('December → January year boundary with billDate=31', () => {
    const today = new Date(2026, 0, 31);
    const result = computeBillingCycle(31, 8, today, true);
    expect(result?.cycleEnd).toBe('2026-01-31');
    expect(result?.cycleStart).toBe('2026-01-01');
  });
});

// ── computePaymentStatus ──────────────────────────────────────────────────

describe('computePaymentStatus', () => {
  it('returns null when daysUntilDue is null (no cycle configured)', () => {
    expect(computePaymentStatus(5000, 5000, 0, null)).toBeNull();
  });

  it('no_payment_due when statementBalance is 0', () => {
    expect(computePaymentStatus(0, 0, 0, 10)).toBe('no_payment_due');
  });

  it('paid when remainingDue is 0 and statementBalance > 0', () => {
    expect(computePaymentStatus(10000, 0, 10000, 5)).toBe('paid');
  });

  it('overdue when daysUntilDue < 0 and unpaid', () => {
    expect(computePaymentStatus(10000, 10000, 0, -3)).toBe('overdue');
  });

  it('overdue when daysUntilDue < 0 and partially paid', () => {
    expect(computePaymentStatus(10000, 4000, 6000, -1)).toBe('overdue');
  });

  it('due_soon when daysUntilDue <= 7 and unpaid', () => {
    expect(computePaymentStatus(10000, 10000, 0, 3)).toBe('due_soon');
  });

  it('due_soon when daysUntilDue === 7 (boundary)', () => {
    expect(computePaymentStatus(10000, 10000, 0, 7)).toBe('due_soon');
  });

  it('due_soon when daysUntilDue === 0 (today)', () => {
    expect(computePaymentStatus(10000, 10000, 0, 0)).toBe('due_soon');
  });

  it('partially_paid when some payment made and due date not imminent', () => {
    expect(computePaymentStatus(10000, 6000, 4000, 15)).toBe('partially_paid');
  });

  it('upcoming when nothing paid and due date > 7 days away', () => {
    expect(computePaymentStatus(10000, 10000, 0, 20)).toBe('upcoming');
  });

  it('paid takes precedence over due_soon', () => {
    expect(computePaymentStatus(10000, 0, 10000, 2)).toBe('paid');
  });

  it('paid takes precedence over overdue', () => {
    expect(computePaymentStatus(10000, 0, 10000, -5)).toBe('paid');
  });
});

// ── computeCardStats: subtype-aware calculations ──────────────────────────

describe('computeCardStats subtype-aware', () => {
  const hdfcCard = makeCard({ linkedPaymentMethod: 'HDFC Credit Card' });
  const cardMethodMap = new Map([['HDFC Credit Card', hdfcCard as CreditCard | undefined]]);

  it('payment subtype reduces outstanding balance', () => {
    const t = [
      makeTxn({ id: 'e1', amount: 1000, date: '2026-05-01', paymentMethod: 'HDFC Credit Card' }),
      makeTxn({ id: 'p1', type: 'income', subtype: 'payment', amount: 400, date: '2026-05-20', paymentMethod: 'HDFC Credit Card' }),
    ];
    const [hdfc] = computeCardStats(cardMethodMap, t, '2026-05', '2026');
    expect(hdfc.outstandingBalance).toBe(600);
  });

  it('refund subtype reduces outstanding balance', () => {
    const t = [
      makeTxn({ id: 'e1', amount: 1000, date: '2026-05-01', paymentMethod: 'HDFC Credit Card' }),
      makeTxn({ id: 'r1', type: 'income', subtype: 'refund', amount: 200, date: '2026-05-10', paymentMethod: 'HDFC Credit Card' }),
    ];
    const [hdfc] = computeCardStats(cardMethodMap, t, '2026-05', '2026');
    expect(hdfc.outstandingBalance).toBe(800);
  });

  it('cashback subtype reduces outstanding balance', () => {
    const t = [
      makeTxn({ id: 'e1', amount: 1000, date: '2026-05-01', paymentMethod: 'HDFC Credit Card' }),
      makeTxn({ id: 'cb1', type: 'income', subtype: 'cashback', amount: 50, date: '2026-05-10', paymentMethod: 'HDFC Credit Card' }),
    ];
    const [hdfc] = computeCardStats(cardMethodMap, t, '2026-05', '2026');
    expect(hdfc.outstandingBalance).toBe(950);
  });

  it('reimbursement subtype reduces outstanding balance', () => {
    const t = [
      makeTxn({ id: 'e1', amount: 1000, date: '2026-05-01', paymentMethod: 'HDFC Credit Card' }),
      makeTxn({ id: 'rb1', type: 'income', subtype: 'reimbursement', amount: 300, date: '2026-05-10', paymentMethod: 'HDFC Credit Card' }),
    ];
    const [hdfc] = computeCardStats(cardMethodMap, t, '2026-05', '2026');
    expect(hdfc.outstandingBalance).toBe(700);
  });

  it('transfer_in subtype does NOT reduce outstanding balance', () => {
    const t = [
      makeTxn({ id: 'e1', amount: 1000, date: '2026-05-01', paymentMethod: 'HDFC Credit Card' }),
      makeTxn({ id: 'ti1', type: 'income', subtype: 'transfer_in', amount: 500, date: '2026-05-10', paymentMethod: 'HDFC Credit Card' }),
    ];
    const [hdfc] = computeCardStats(cardMethodMap, t, '2026-05', '2026');
    expect(hdfc.outstandingBalance).toBe(1000);
  });

  it('undefined subtype income reduces outstanding (backward compat)', () => {
    const t = [
      makeTxn({ id: 'e1', amount: 1000, date: '2026-05-01', paymentMethod: 'HDFC Credit Card' }),
      makeTxn({ id: 'u1', type: 'income', amount: 600, date: '2026-05-10', paymentMethod: 'HDFC Credit Card' }),
    ];
    const [hdfc] = computeCardStats(cardMethodMap, t, '2026-05', '2026');
    expect(hdfc.outstandingBalance).toBe(400);
  });

  // paymentsAfterCycle — use dynamic dates so payment is always after the current cycleEnd
  // billDate=1 means cycleEnd = 1st of current month; payment must be after that date
  const cardWithCycle = makeCard({ billDate: 1, duePeriod: 14, linkedPaymentMethod: 'HDFC Credit Card' });
  const mapWithCycle = new Map([['HDFC Credit Card', cardWithCycle as CreditCard | undefined]]);

  function currentYearMonth() {
    const d = new Date();
    return { year: d.getFullYear(), month: String(d.getMonth() + 1).padStart(2, '0') };
  }
  function prevYearMonth() {
    const d = new Date();
    if (d.getMonth() === 0) return { year: d.getFullYear() - 1, month: '12' };
    return { year: d.getFullYear(), month: String(d.getMonth()).padStart(2, '0') };
  }

  it('payment subtype counts as paymentsAfterCycle', () => {
    const cur = currentYearMonth();
    const prev = prevYearMonth();
    const t = [
      makeTxn({ id: 'e1', amount: 1000, date: `${prev.year}-${prev.month}-15`, paymentMethod: 'HDFC Credit Card' }),
      makeTxn({ id: 'p1', type: 'income', subtype: 'payment', amount: 1000, date: `${cur.year}-${cur.month}-05`, paymentMethod: 'HDFC Credit Card' }),
    ];
    const [hdfc] = computeCardStats(mapWithCycle, t, `${cur.year}-${cur.month}`, String(cur.year));
    expect(hdfc.paymentsAfterCycle).toBe(1000);
  });

  it('refund does NOT count as paymentsAfterCycle', () => {
    const cur = currentYearMonth();
    const prev = prevYearMonth();
    const t = [
      makeTxn({ id: 'e1', amount: 1000, date: `${prev.year}-${prev.month}-15`, paymentMethod: 'HDFC Credit Card' }),
      makeTxn({ id: 'r1', type: 'income', subtype: 'refund', amount: 1000, date: `${cur.year}-${cur.month}-05`, paymentMethod: 'HDFC Credit Card' }),
    ];
    const [hdfc] = computeCardStats(mapWithCycle, t, `${cur.year}-${cur.month}`, String(cur.year));
    expect(hdfc.paymentsAfterCycle).toBe(0);
    expect(hdfc.outstandingBalance).toBe(0);
  });

  it('cashback does NOT count as paymentsAfterCycle', () => {
    const cur = currentYearMonth();
    const prev = prevYearMonth();
    const t = [
      makeTxn({ id: 'e1', amount: 1000, date: `${prev.year}-${prev.month}-15`, paymentMethod: 'HDFC Credit Card' }),
      makeTxn({ id: 'cb1', type: 'income', subtype: 'cashback', amount: 1000, date: `${cur.year}-${cur.month}-05`, paymentMethod: 'HDFC Credit Card' }),
    ];
    const [hdfc] = computeCardStats(mapWithCycle, t, `${cur.year}-${cur.month}`, String(cur.year));
    expect(hdfc.paymentsAfterCycle).toBe(0);
  });

  it('reimbursement does NOT count as paymentsAfterCycle', () => {
    const cur = currentYearMonth();
    const prev = prevYearMonth();
    const t = [
      makeTxn({ id: 'e1', amount: 1000, date: `${prev.year}-${prev.month}-15`, paymentMethod: 'HDFC Credit Card' }),
      makeTxn({ id: 'rb1', type: 'income', subtype: 'reimbursement', amount: 1000, date: `${cur.year}-${cur.month}-05`, paymentMethod: 'HDFC Credit Card' }),
    ];
    const [hdfc] = computeCardStats(mapWithCycle, t, `${cur.year}-${cur.month}`, String(cur.year));
    expect(hdfc.paymentsAfterCycle).toBe(0);
  });

  it('transfer_in does NOT count as paymentsAfterCycle and does NOT reduce outstanding', () => {
    const cur = currentYearMonth();
    const prev = prevYearMonth();
    const t = [
      makeTxn({ id: 'e1', amount: 1000, date: `${prev.year}-${prev.month}-15`, paymentMethod: 'HDFC Credit Card' }),
      makeTxn({ id: 'ti1', type: 'income', subtype: 'transfer_in', amount: 1000, date: `${cur.year}-${cur.month}-05`, paymentMethod: 'HDFC Credit Card' }),
    ];
    const [hdfc] = computeCardStats(mapWithCycle, t, `${cur.year}-${cur.month}`, String(cur.year));
    expect(hdfc.paymentsAfterCycle).toBe(0);
    expect(hdfc.outstandingBalance).toBe(1000);
  });

  it('undefined subtype income counts as paymentsAfterCycle (backward compat)', () => {
    const cur = currentYearMonth();
    const prev = prevYearMonth();
    const t = [
      makeTxn({ id: 'e1', amount: 1000, date: `${prev.year}-${prev.month}-15`, paymentMethod: 'HDFC Credit Card' }),
      makeTxn({ id: 'u1', type: 'income', amount: 1000, date: `${cur.year}-${cur.month}-05`, paymentMethod: 'HDFC Credit Card' }),
    ];
    const [hdfc] = computeCardStats(mapWithCycle, t, `${cur.year}-${cur.month}`, String(cur.year));
    expect(hdfc.paymentsAfterCycle).toBe(1000);
  });
});

// ── computeCardStats: cashback tracking ──────────────────────────────────

describe('computeCardStats cashback', () => {
  const hdfcCard = makeCard({ linkedPaymentMethod: 'HDFC Credit Card' });
  const cardMethodMap = new Map([['HDFC Credit Card', hdfcCard as CreditCard | undefined]]);

  it('lifetimeCashback sums only cashback-subtyped income', () => {
    const t = [
      makeTxn({ id: 'e1', amount: 1000, date: '2026-05-01', paymentMethod: 'HDFC Credit Card' }),
      makeTxn({ id: 'cb1', type: 'income', subtype: 'cashback', amount: 50, date: '2026-05-10', paymentMethod: 'HDFC Credit Card' }),
      makeTxn({ id: 'cb2', type: 'income', subtype: 'cashback', amount: 30, date: '2026-04-10', paymentMethod: 'HDFC Credit Card' }),
    ];
    const [hdfc] = computeCardStats(cardMethodMap, t, '2026-05', '2026');
    expect(hdfc.lifetimeCashback).toBe(80);
  });

  it('monthlyCashback filters to current month only', () => {
    const t = [
      makeTxn({ id: 'cb1', type: 'income', subtype: 'cashback', amount: 50, date: '2026-05-10', paymentMethod: 'HDFC Credit Card' }),
      makeTxn({ id: 'cb2', type: 'income', subtype: 'cashback', amount: 30, date: '2026-04-10', paymentMethod: 'HDFC Credit Card' }),
    ];
    const [hdfc] = computeCardStats(cardMethodMap, t, '2026-05', '2026');
    expect(hdfc.monthlyCashback).toBe(50);
    expect(hdfc.lifetimeCashback).toBe(80);
  });

  it('yearlyCashback filters to current year only', () => {
    const t = [
      makeTxn({ id: 'cb1', type: 'income', subtype: 'cashback', amount: 50, date: '2026-05-10', paymentMethod: 'HDFC Credit Card' }),
      makeTxn({ id: 'cb2', type: 'income', subtype: 'cashback', amount: 30, date: '2025-12-10', paymentMethod: 'HDFC Credit Card' }),
    ];
    const [hdfc] = computeCardStats(cardMethodMap, t, '2026-05', '2026');
    expect(hdfc.yearlyCashback).toBe(50);
    expect(hdfc.lifetimeCashback).toBe(80);
  });

  it('payment subtype does NOT contribute to cashback', () => {
    const t = [
      makeTxn({ id: 'p1', type: 'income', subtype: 'payment', amount: 500, date: '2026-05-10', paymentMethod: 'HDFC Credit Card' }),
    ];
    const [hdfc] = computeCardStats(cardMethodMap, t, '2026-05', '2026');
    expect(hdfc.lifetimeCashback).toBe(0);
    expect(hdfc.monthlyCashback).toBe(0);
  });

  it('refund subtype does NOT contribute to cashback', () => {
    const t = [
      makeTxn({ id: 'r1', type: 'income', subtype: 'refund', amount: 200, date: '2026-05-10', paymentMethod: 'HDFC Credit Card' }),
    ];
    const [hdfc] = computeCardStats(cardMethodMap, t, '2026-05', '2026');
    expect(hdfc.lifetimeCashback).toBe(0);
  });

  it('undefined subtype income does NOT contribute to cashback', () => {
    const t = [
      makeTxn({ id: 'u1', type: 'income', amount: 300, date: '2026-05-10', paymentMethod: 'HDFC Credit Card' }),
    ];
    const [hdfc] = computeCardStats(cardMethodMap, t, '2026-05', '2026');
    expect(hdfc.lifetimeCashback).toBe(0);
  });

  it('cashback is 0 when no cashback transactions exist', () => {
    const t = [
      makeTxn({ id: 'e1', amount: 1000, date: '2026-05-01', paymentMethod: 'HDFC Credit Card' }),
    ];
    const [hdfc] = computeCardStats(cardMethodMap, t, '2026-05', '2026');
    expect(hdfc.lifetimeCashback).toBe(0);
    expect(hdfc.monthlyCashback).toBe(0);
    expect(hdfc.yearlyCashback).toBe(0);
  });

  it('cashback still reduces outstanding balance', () => {
    const t = [
      makeTxn({ id: 'e1', amount: 1000, date: '2026-05-01', paymentMethod: 'HDFC Credit Card' }),
      makeTxn({ id: 'cb1', type: 'income', subtype: 'cashback', amount: 100, date: '2026-05-10', paymentMethod: 'HDFC Credit Card' }),
    ];
    const [hdfc] = computeCardStats(cardMethodMap, t, '2026-05', '2026');
    expect(hdfc.outstandingBalance).toBe(900);
    expect(hdfc.lifetimeCashback).toBe(100);
  });

  it('cashback does NOT count as paymentsAfterCycle', () => {
    const cardWithCycle = makeCard({ billDate: 1, duePeriod: 14, linkedPaymentMethod: 'HDFC Credit Card' });
    const map = new Map([['HDFC Credit Card', cardWithCycle as CreditCard | undefined]]);
    const cur = (() => { const d = new Date(); return { year: d.getFullYear(), month: String(d.getMonth() + 1).padStart(2, '0') }; })();
    const prev = (() => { const d = new Date(); if (d.getMonth() === 0) return { year: d.getFullYear() - 1, month: '12' }; return { year: d.getFullYear(), month: String(d.getMonth()).padStart(2, '0') }; })();
    const t = [
      makeTxn({ id: 'e1', amount: 1000, date: `${prev.year}-${prev.month}-15`, paymentMethod: 'HDFC Credit Card' }),
      makeTxn({ id: 'cb1', type: 'income', subtype: 'cashback', amount: 1000, date: `${cur.year}-${cur.month}-05`, paymentMethod: 'HDFC Credit Card' }),
    ];
    const [hdfc] = computeCardStats(map, t, `${cur.year}-${cur.month}`, String(cur.year));
    expect(hdfc.paymentsAfterCycle).toBe(0);
    expect(hdfc.lifetimeCashback).toBe(1000);
  });
});
