// Compatibility barrel — preserves the existing `api` object shape so all
// current consumers (`import { api } from '@/lib/api/client'`) continue to
// work without modification.
//
// Internal implementation has moved to domain modules:
//   src/lib/api/http.ts             — shared HTTP transport
//   src/lib/api/transactions.ts     — transaction CRUD
//   src/lib/api/settings.ts         — settings + db-stats
//   src/lib/api/budgets.ts          — budget CRUD
//   src/lib/api/profiles.ts         — profile CRUD
//   src/lib/api/subscriptions.ts    — subscription CRUD
//   src/lib/api/debts.ts            — debt CRUD
//   src/lib/api/goals.ts            — goal CRUD
//   src/lib/api/creditCards.ts      — credit card CRUD
//   src/lib/api/health.ts           — health / version
//   src/lib/api/auth.ts             — register / login
//   src/lib/api/financialConfig.ts  — financial config (E4.5)

export { API_BASE } from './http';
export { ApiError } from './errors';

import { transactionsApi } from './transactions';
import { settingsApi } from './settings';
import { budgetsApi } from './budgets';
import { subscriptionsApi } from './subscriptions';
import { debtsApi } from './debts';
import { goalsApi } from './goals';
import { creditCardsApi } from './creditCards';
import { healthApi } from './health';
import { authApi } from './auth';
import { financialConfigApi } from './financialConfig';

import type {
  NewTransaction,
  TransactionUpdate,
  NewSubscription,
  SubscriptionUpdate,
  NewDebt,
  DebtUpdate,
  NewGoal,
  NewCreditCard,
  CreditCardUpdate,
  NewBudget,
  SettingsUpdate,
  FinancialConfig,
  LoginRequest,
  RegisterRequest,
} from '@/lib/types/api';

/** Backwards-compatible api object. Shape is identical to the original. */
export const api = {
  // Health / version
  health: () => healthApi.check(),
  version: () => healthApi.version(),

  // Auth
  register: (data: RegisterRequest) => authApi.register(data),
  login: (data: LoginRequest) => authApi.login(data),

  // Transactions
  getTransactions: (opts: { context?: string; month?: string } = {}) =>
    transactionsApi.getAll(opts),
  createTransaction: (data: NewTransaction) => transactionsApi.create(data),
  updateTransaction: (id: string, data: TransactionUpdate) => transactionsApi.update(id, data),
  deleteTransaction: (id: string) => transactionsApi.delete(id),
  bulkCreateTransactions: (data: NewTransaction[]) => transactionsApi.bulkCreate(data),
  bulkDeleteTransactions: (ids: string[]) => transactionsApi.bulkDelete(ids),

  // Subscriptions
  getSubscriptions: (opts: { context?: string } = {}) => subscriptionsApi.getAll(opts),
  createSubscription: (data: NewSubscription) => subscriptionsApi.create(data),
  updateSubscription: (id: string, data: SubscriptionUpdate) => subscriptionsApi.update(id, data),
  deleteSubscription: (id: string) => subscriptionsApi.delete(id),

  // Debts
  getDebts: (opts: { context?: string } = {}) => debtsApi.getAll(opts),
  createDebt: (data: NewDebt) => debtsApi.create(data),
  updateDebt: (id: string, data: DebtUpdate) => debtsApi.update(id, data),
  deleteDebt: (id: string) => debtsApi.delete(id),

  // Goals
  getGoals: (opts: { context?: string } = {}) => goalsApi.getAll(opts),
  upsertGoal: (data: NewGoal) => goalsApi.upsert(data),
  deleteGoal: (id: string) => goalsApi.delete(id),

  // Credit cards
  getCreditCards: (opts: { context?: string } = {}) => creditCardsApi.getAll(opts),
  getArchivedCreditCards: (opts: { context?: string } = {}) => creditCardsApi.getArchived(opts),
  createCreditCard: (data: NewCreditCard) => creditCardsApi.create(data),
  updateCreditCard: (id: string, data: CreditCardUpdate) => creditCardsApi.update(id, data),
  archiveCreditCard: (id: string) => creditCardsApi.archive(id),
  restoreCreditCard: (id: string) => creditCardsApi.restore(id),
  deleteCreditCard: (id: string) => creditCardsApi.delete(id),

  // Settings
  getSettings: (opts: { context?: string } = {}) => settingsApi.get(opts),
  updateSettings: (data: SettingsUpdate) => settingsApi.update(data),
  getDbStats: () => settingsApi.getDbStats(),

  // Budgets
  getBudgets: (opts: { context?: string; month?: string } = {}) => budgetsApi.getAll(opts),
  upsertBudget: (data: NewBudget) => budgetsApi.upsert(data),
  deleteBudget: (id: string) => budgetsApi.delete(id),

  // FinancialConfig (E4.5)
  getFinancialConfig: (opts: { context?: string } = {}) => financialConfigApi.get(opts),
  updateFinancialConfig: (data: Partial<FinancialConfig> & { context: string }) =>
    financialConfigApi.update(data),
} as const;

export type Api = typeof api;
