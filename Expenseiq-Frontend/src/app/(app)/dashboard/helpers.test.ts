import {
  computeStats,
  computeCategoryBreakdown,
  computeMonthTrends,
  getGoalForMonth,
  computeMonthlySubscriptionCost,
  computeBudgetUsage,
  generateInsights,
} from './helpers';
import type { Transaction, Goal, Subscription, Budget } from '@/lib/types/api';

const txns: Transaction[] = [
  { id: '1', context: 'default', type: 'income', amount: 75000, date: '2026-05-01', category: 'Salary' },
  { id: '2', context: 'default', type: 'expense', amount: 8000, date: '2026-05-02', category: 'Food' },
  { id: '3', context: 'default', type: 'expense', amount: 4000, date: '2026-05-03', category: 'Transport' },
  { id: '4', context: 'default', type: 'expense', amount: 3000, date: '2026-05-04', category: 'Food' },
];

describe('computeStats', () => {
  it('computes income, expense, balance, count, avg, savings rate', () => {
    const s = computeStats(txns);
    expect(s.income).toBe(75000);
    expect(s.expense).toBe(15000);
    expect(s.balance).toBe(60000);
    expect(s.txnCount).toBe(4);
    expect(s.avgExpense).toBe(5000);
    expect(s.savingsRate).toBeCloseTo(80);
  });

  it('handles empty array', () => {
    const s = computeStats([]);
    expect(s.income).toBe(0);
    expect(s.expense).toBe(0);
    expect(s.savingsRate).toBe(0);
  });
});

describe('computeCategoryBreakdown', () => {
  it('groups expenses by category sorted desc', () => {
    const cats = computeCategoryBreakdown(txns);
    expect(cats[0]).toEqual({ category: 'Food', amount: 11000 });
    expect(cats[1]).toEqual({ category: 'Transport', amount: 4000 });
  });

  it('ignores income transactions', () => {
    const cats = computeCategoryBreakdown(txns);
    expect(cats.find((c) => c.category === 'Salary')).toBeUndefined();
  });
});

describe('computeMonthTrends', () => {
  it('returns income/expense per month', () => {
    const byMonth = { '2026-05': txns, '2026-04': [] };
    const trends = computeMonthTrends(byMonth, ['2026-04', '2026-05']);
    expect(trends[0]).toEqual({ month: '2026-04', income: 0, expense: 0 });
    expect(trends[1]).toEqual({ month: '2026-05', income: 75000, expense: 15000 });
  });
});

describe('getGoalForMonth', () => {
  const goals: Goal[] = [
    { id: '1', context: 'default', month: '2026-05', amount: 50000 },
    { id: '2', context: 'default', month: '2026-04', amount: 40000 },
  ];

  it('finds the goal for the given month', () => {
    expect(getGoalForMonth(goals, '2026-05')?.amount).toBe(50000);
  });

  it('returns undefined for missing month', () => {
    expect(getGoalForMonth(goals, '2026-06')).toBeUndefined();
  });
});

describe('computeMonthlySubscriptionCost', () => {
  const subs: Subscription[] = [
    { id: '1', context: 'default', name: 'Netflix', amount: 649, cycle: 'monthly', due: '2026-05-15', active: true },
    { id: '2', context: 'default', name: 'Gym', amount: 12000, cycle: 'yearly', due: '2026-01-01', active: true },
    { id: '3', context: 'default', name: 'Paused', amount: 500, cycle: 'monthly', due: '2026-05-01', active: false },
  ];

  it('sums monthly cost (yearly/12, excludes inactive)', () => {
    const cost = computeMonthlySubscriptionCost(subs);
    expect(cost).toBeCloseTo(649 + 1000); // 649 + 12000/12
  });
});

describe('computeBudgetUsage', () => {
  const budgets: Budget[] = [
    { id: '1', context: 'default', month: '2026-05', category: 'Food', amount: 10000 },
    { id: '2', context: 'default', month: '2026-05', category: 'Transport', amount: 5000 },
  ];

  it('computes total budget and used amount', () => {
    const usage = computeBudgetUsage(budgets, txns);
    expect(usage.total).toBe(15000);
    expect(usage.used).toBe(15000); // 11000 food + 4000 transport
    expect(usage.categories).toBe(2);
  });
});

describe('generateInsights', () => {
  it('generates positive insight for high savings rate', () => {
    const stats = computeStats(txns);
    const insights = generateInsights(stats);
    expect(insights.some((i) => i.type === 'positive' && i.text.includes('savings rate'))).toBe(true);
  });

  it('generates spending-up insight when expense increased', () => {
    const stats = { income: 75000, expense: 50000, balance: 25000, txnCount: 10, avgExpense: 5000, savingsRate: 33 };
    const prev = { income: 70000, expense: 30000, balance: 40000, txnCount: 8, avgExpense: 3750, savingsRate: 57 };
    const insights = generateInsights(stats, prev);
    expect(insights.some((i) => i.type === 'negative' && i.text.includes('up'))).toBe(true);
  });

  it('generates neutral insight for empty month', () => {
    const stats = computeStats([]);
    const insights = generateInsights(stats);
    expect(insights.some((i) => i.type === 'neutral')).toBe(true);
  });
});
