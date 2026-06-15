// Centralized query key factory.
//
// Usage:
//   qc.invalidateQueries({ queryKey: queryKeys.transactions.all })  — blow entire resource cache
//   qc.invalidateQueries({ queryKey: queryKeys.transactions.list(profileId, month) })  — targeted
//
// Domain ownership mirrors src/lib/api/* modules introduced in E4.1.
export const queryKeys = {
  // ── Ops ─────────────────────────────────────────────────────
  health: ['health'] as const,
  version: ['version'] as const,
  dbStats: ['dbStats'] as const,

  // ── Transactions ────────────────────────────────────────────
  transactions: {
    all: ['transactions'] as const,
    list: (context: string = 'Personal', month?: string) =>
      ['transactions', 'list', context, month ?? null] as const,
  },

  // ── Subscriptions ───────────────────────────────────────────
  subscriptions: {
    all: ['subscriptions'] as const,
    list: (context: string = 'Personal') => ['subscriptions', 'list', context] as const,
  },

  // ── Debts ───────────────────────────────────────────────────
  debts: {
    all: ['debts'] as const,
    list: (context: string = 'Personal') => ['debts', 'list', context] as const,
  },

  // ── Goals ───────────────────────────────────────────────────
  goals: {
    all: ['goals'] as const,
    list: (context: string = 'Personal') => ['goals', 'list', context] as const,
  },

  // ── Profiles ────────────────────────────────────────────────
  profiles: {
    all: ['profiles'] as const,
    list: () => ['profiles', 'list'] as const,
  },

  // ── Credit Cards ────────────────────────────────────────────
  creditCards: {
    all: ['creditcards'] as const,
    list: (context: string = 'Personal') => ['creditcards', 'list', context] as const,
  },

  // ── Settings (categories, payment methods, subcategories) ───
  settings: {
    all: ['settings'] as const,
    one: (context: string = 'Personal') => ['settings', 'one', context] as const,
  },

  // ── FinancialConfig (E4.5 — dedicated domain endpoint) ──────
  financialConfig: {
    all: ['financialConfig'] as const,
    one: (context: string = 'Personal') => ['financialConfig', 'one', context] as const,
  },

  // ── Budgets ─────────────────────────────────────────────────
  budgets: {
    all: ['budgets'] as const,
    list: (context: string = 'Personal', month?: string) =>
      ['budgets', 'list', context, month ?? null] as const,
  },
} as const;
