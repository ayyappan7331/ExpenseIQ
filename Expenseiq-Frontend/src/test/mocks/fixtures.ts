// Sample documents used by MSW handlers. Shapes match what the backend
// emits AFTER its toJSON transforms (dates are YYYY-MM-DD strings,
// Mongoose _id is a hex string).

import type {
  Budget,
  CreditCard,
  Debt,
  FinancialConfig,
  Goal,
  HealthResponse,
  Settings,
  Subscription,
  Transaction,
  VersionResponse,
} from '@/lib/types/api';

// Sentinel ObjectId-shaped strings so id-based round-trips look real.
const OID = (n: number) => `507f1f77bcf86cd79943${String(n).padStart(4, '0')}`;

export const fixtures = {
  health: { status: 'ok' as const, timestamp: '2026-05-22T00:00:00.000Z' } satisfies HealthResponse,

  version: {
    version: '0.1.0',
    gitSha: 'unknown',
    nodeEnv: 'test',
  } satisfies VersionResponse,

  profiles: [
    { _id: OID(1), context: 'default', name: 'Personal', icon: '👤', isDefault: true },
    { _id: OID(2), context: 'work', name: 'Work', icon: '💼', isDefault: false },
  ] as Array<any>,

  transactions: [
    {
      _id: OID(10),
      context: 'default',
      type: 'expense',
      amount: 250,
      category: 'Food',
      source: '',
      date: '2026-05-10',
      paymentMethod: 'HDFC Credit Card',
      notes: 'Lunch with team',
    },
    {
      _id: OID(11),
      context: 'default',
      type: 'income',
      amount: 50000,
      category: '',
      source: 'Salary',
      date: '2026-05-01',
      paymentMethod: '',
      notes: '',
    },
  ] as Array<Transaction & { _id: string }>,

  subscriptions: [
    {
      _id: OID(20),
      context: 'default',
      name: 'Netflix',
      amount: 499,
      cycle: 'monthly',
      due: '2026-05-15',
      category: 'Entertainment',
      active: true,
    },
  ] as Array<Subscription & { _id: string }>,

  debts: [
    {
      _id: OID(30),
      context: 'default',
      type: 'lent',
      person: 'Alice',
      amount: 500,
      note: '',
      date: '2026-05-05',
      settled: false,
      settledDate: null,
    },
  ] as Array<Debt & { _id: string }>,

  goals: [
    { _id: OID(40), context: 'default', month: '2026-05', amount: 10000 },
  ] as Array<Goal & { _id: string }>,

  creditCards: [
    {
      _id: OID(50),
      context: 'default',
      name: 'HDFC Credit Card',
      billDate: 19,
      dueDate: 8,
      color: '#7c6ff7',
      linkedPaymentMethod: 'HDFC Credit Card',
    },
  ] as Array<CreditCard & { _id: string }>,

  settings: {
    _id: OID(60),
    context: 'default',
    theme: 'dark',
    widgets: ['chart', 'recent', 'goals'],
    widgetOrder: [],
  } as Settings & { _id: string },

  budgets: [
    {
      _id: OID(70),
      context: 'default',
      month: '2026-05',
      category: 'Food',
      amount: 5000,
    },
  ] as Array<Budget & { _id: string }>,

  financialConfig: {
    _id: OID(80),
    context: 'default',
    customExpenseCategories: [],
    customIncomeCategories: [],
    customPaymentMethods: ['HDFC Credit Card', 'GPay'],
    customPaymentApps: [],
    subcategoryMap: {},
    transactionTemplates: [],
    favoriteTransactions: [],
    pinnedTransactionIds: [],
  } as FinancialConfig & { _id: string },
};
