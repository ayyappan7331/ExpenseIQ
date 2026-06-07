// Centralized query key factory.
//
// Usage:
//   qc.invalidateQueries({ queryKey: queryKeys.transactions.all })  — blow entire resource cache
//   qc.invalidateQueries({ queryKey: queryKeys.transactions.list(profileId, month) })  — targeted
//
// Domain ownership mirrors src/lib/api/* modules introduced in E4.1.

import type { ProfileId } from '@/lib/types/api';

export const queryKeys = {
  // ── Ops ─────────────────────────────────────────────────────
  health: ['health'] as const,
  version: ['version'] as const,
  dbStats: ['dbStats'] as const,

  // ── Transactions ────────────────────────────────────────────
  transactions: {
    all: ['transactions'] as const,
    list: (profileId: ProfileId, month?: string) =>
      ['transactions', 'list', profileId, month ?? null] as const,
  },

  // ── Subscriptions ───────────────────────────────────────────
  subscriptions: {
    all: ['subscriptions'] as const,
    list: (profileId: ProfileId) => ['subscriptions', 'list', profileId] as const,
  },

  // ── Debts ───────────────────────────────────────────────────
  debts: {
    all: ['debts'] as const,
    list: (profileId: ProfileId) => ['debts', 'list', profileId] as const,
  },

  // ── Goals ───────────────────────────────────────────────────
  goals: {
    all: ['goals'] as const,
    list: (profileId: ProfileId) => ['goals', 'list', profileId] as const,
  },

  // ── Profiles ────────────────────────────────────────────────
  profiles: {
    all: ['profiles'] as const,
    list: () => ['profiles', 'list'] as const,
  },

  // ── Credit Cards ────────────────────────────────────────────
  creditCards: {
    all: ['creditcards'] as const,
    list: (profileId: ProfileId) => ['creditcards', 'list', profileId] as const,
  },

  // ── Settings (categories, payment methods, subcategories) ───
  settings: {
    all: ['settings'] as const,
    one: (profileId: ProfileId) => ['settings', 'one', profileId] as const,
  },

  // ── FinancialConfig (E4.5 — dedicated domain endpoint) ──────
  financialConfig: {
    all: ['financialConfig'] as const,
    one: (profileId: ProfileId) => ['financialConfig', 'one', profileId] as const,
  },

  // ── Budgets ─────────────────────────────────────────────────
  budgets: {
    all: ['budgets'] as const,
    list: (profileId: ProfileId, month?: string) =>
      ['budgets', 'list', profileId, month ?? null] as const,
  },
} as const;
