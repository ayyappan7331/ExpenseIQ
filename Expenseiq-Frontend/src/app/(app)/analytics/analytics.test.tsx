import { computePaymentBreakdown, computeSavingsTrend, computeComparison, pctChange } from './helpers';
import { render, screen, waitFor } from '@/test/utils/render';
import AnalyticsPage from './page';
import type { Transaction } from '@/lib/types/api';

const txns: Transaction[] = [
  { id: '1', profileId: 'default', type: 'expense', amount: 3000, category: 'Food', paymentMethod: 'UPI', date: '2026-05-01' },
  { id: '2', profileId: 'default', type: 'expense', amount: 2000, category: 'Transport', paymentMethod: 'Cash', date: '2026-05-02' },
  { id: '3', profileId: 'default', type: 'expense', amount: 1000, category: 'Food', paymentMethod: 'UPI', date: '2026-05-03' },
  { id: '4', profileId: 'default', type: 'income', amount: 75000, category: 'Salary', date: '2026-05-01' },
];

describe('computePaymentBreakdown', () => {
  it('groups expenses by payment method sorted desc', () => {
    const result = computePaymentBreakdown(txns);
    expect(result[0]).toEqual({ method: 'UPI', amount: 4000 });
    expect(result[1]).toEqual({ method: 'Cash', amount: 2000 });
  });

  it('ignores income transactions', () => {
    const result = computePaymentBreakdown(txns);
    expect(result.find((r) => r.method === 'Salary')).toBeUndefined();
  });
});

describe('computeSavingsTrend', () => {
  it('computes savings per month', () => {
    const byMonth = { '2026-05': txns, '2026-04': [] };
    const result = computeSavingsTrend(byMonth, ['2026-04', '2026-05']);
    expect(result[0].saved).toBe(0);
    expect(result[1].saved).toBe(69000); // 75000 - 6000
  });

  it('excludes transfer_in from income and transfer_out from expenses', () => {
    const withTransfers: Transaction[] = [
      { id: 't1', profileId: 'default', type: 'income', subtype: 'transfer_in', amount: 50000, category: '', date: '2026-05-01' },
      { id: 't2', profileId: 'default', type: 'expense', subtype: 'transfer_out', amount: 30000, category: '', date: '2026-05-01' },
      { id: 't3', profileId: 'default', type: 'income', amount: 10000, category: 'Salary', date: '2026-05-02' },
      { id: 't4', profileId: 'default', type: 'expense', amount: 2000, category: 'Food', date: '2026-05-03' },
    ];
    const byMonth = { '2026-05': withTransfers };
    const result = computeSavingsTrend(byMonth, ['2026-05']);
    // Only real income (10000) - real expense (2000) = 8000; transfers excluded
    expect(result[0].saved).toBe(8000);
  });
});

describe('computeComparison', () => {
  const txnsB: Transaction[] = [
    { id: '5', profileId: 'default', type: 'expense', amount: 5000, category: 'Food', date: '2026-06-01' },
    { id: '6', profileId: 'default', type: 'expense', amount: 3000, category: 'Bills', date: '2026-06-02' },
  ];

  it('computes per-category change between two months', () => {
    const result = computeComparison(txns, txnsB);
    const food = result.find((r) => r.category === 'Food');
    expect(food?.monthA).toBe(4000);
    expect(food?.monthB).toBe(5000);
    expect(food?.change).toBe(1000);
  });

  it('includes categories only in one month', () => {
    const result = computeComparison(txns, txnsB);
    const bills = result.find((r) => r.category === 'Bills');
    expect(bills?.monthA).toBe(0);
    expect(bills?.monthB).toBe(3000);
  });
});

describe('pctChange', () => {
  it('computes percentage change', () => {
    expect(pctChange(120, 100)).toBeCloseTo(20);
    expect(pctChange(80, 100)).toBeCloseTo(-20);
  });

  it('handles zero previous', () => {
    expect(pctChange(100, 0)).toBe(100);
    expect(pctChange(0, 0)).toBe(0);
  });
});

describe('AnalyticsPage', () => {
  it('renders the page header', async () => {
    render(<AnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: 'Analytics' })).toBeInTheDocument();
    });
  });

  it('renders stat cards after data loads', async () => {
    render(<AnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText('Income')).toBeInTheDocument();
      expect(screen.getByText('Savings')).toBeInTheDocument();
      expect(screen.getByText('Avg Expense')).toBeInTheDocument();
    });
  });
});
