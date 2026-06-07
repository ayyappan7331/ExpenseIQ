# ExpenseIQ Frontend — Architecture Notes (E3 Complete / E4 Readiness)

## Current Persistence Architecture

### Backend API (React Query)
All financial data lives in the backend and is accessed via typed hooks in `src/lib/hooks/queries/`.

| Data | Hook | Cache Key |
|---|---|---|
| Transactions | `useTransactions({ profileId, month })` | `['transactions','list', profileId, month]` |
| Settings (categories, payment methods, subcategories) | `useSettings({ profileId })` | `['settings','one', profileId]` |
| Budgets | `useBudgets` | `['budgets','list', profileId, month]` |
| Goals, Debts, Subscriptions, Credit Cards | individual hooks | per-resource keys |

**Mutation pattern:** All mutations use `onMutate` optimistic updates + `setQueryData` for immediate UI reflection, with `onError` rollback and `onSuccess` invalidation. See `useCategories.ts`, `useSubcategories.ts`, `usePaymentMethods.ts`.

### Settings Object (Backend-persisted)
`Settings` stores user configuration that belongs to a profile:
- `customExpenseCategories: string[]`
- `customIncomeCategories: string[]`
- `customPaymentMethods: string[]`
- `subcategoryMap: Record<string, string[]>`
- `theme`, `widgets`, `widgetOrder`

**E4 note:** Settings is a single flat document per profile. As features grow, consider splitting into `UserPreferences` (theme, density) and `FinancialConfig` (categories, payment methods) domain objects.

### localStorage (Client-only)
Client-side state that does not need backend persistence:

| Key | Type | Used by |
|---|---|---|
| `expenseiq_pinned_transactions` | `string[]` (transaction IDs) | `usePinnedTransactions` |
| `expenseiq_favorite_transactions` | `FavoriteTransaction[]` | `FavoriteTransactions`, `useFavoriteIds` |
| `expenseiq_transaction_templates` | `TransactionTemplate[]` | `TransactionTemplatesModal` |
| `expenseiq_table_density` | `'compact' \| 'comfortable'` | `useDensityMode` |

All localStorage access goes through `src/lib/utils/localStorage.ts` (`lsGet`, `lsSet`, `lsGetOne`, `lsSetOne`).

**E4 note:** Pins and favorites are currently structural-match only (category+subcategory+type+paymentMethod). Moving them to backend with transaction IDs would make matching exact and cross-device.

## React Query Cache Structure

```
QueryClient
├── ['settings', 'one', profileId]          ← Settings (categories, methods, subcats)
├── ['transactions', 'list', profileId, month]
├── ['budgets', 'list', profileId, month]
├── ['goals', 'list', profileId]
├── ['subscriptions', 'list', profileId]
├── ['debts', 'list', profileId]
├── ['creditcards', 'list', profileId]
└── ['profiles', 'list']
```

Cache invalidation uses `queryKeys` factory from `src/lib/hooks/queries/keys.ts`. Always invalidate by `settings.one(profileId)` not `settings.all` to avoid cross-profile cache pollution.

## Transaction Page Architecture (E3 Final)

```
page.tsx
├── useRowOrchestration()        — inline row show/hide/duplicate state
├── useModalOrchestration()      — all modal open/close state
├── useActionOrchestration()     — delete/bulk-delete/bulk-edit callbacks
├── useFilterState()             — filter + quickFilter state
├── useSortState()               — sort key + direction
├── useBulkSelection()           — selected row IDs
├── usePinnedTransactions()      — pinned IDs (localStorage)
├── useDensityMode()             — compact/comfortable (localStorage)
├── useFavoriteIds()             — structural match of favorites → transaction IDs
└── usePageKeyboardShortcuts()   — N / / shortcuts with modal guard
```

## Recommended E4.1 Direction

**E4.1 — Domain API Separation** ✅ COMPLETED

**E4.2 — Profile-Aware Persistence + Domain Consistency** ✅ COMPLETED

The `api` client has been split into domain-scoped modules:

```
src/lib/api/
├── http.ts          — shared transport (request, getList, postOne, putOne, del, normalizeOne)
├── errors.ts        — ApiError class
├── client.ts        — backwards-compatible barrel (api object, unchanged shape)
├── transactions.ts  — transactionsApi
├── settings.ts      — settingsApi
├── budgets.ts       — budgetsApi
├── profiles.ts      — profilesApi
├── subscriptions.ts — subscriptionsApi
├── debts.ts         — debtsApi
├── goals.ts         — goalsApi
├── creditCards.ts   — creditCardsApi
├── health.ts        — healthApi
└── auth.ts          — authApi
```

**Migration rule:** All existing `import { api } from '@/lib/api/client'` continue to work unchanged. New code should import from domain modules directly (e.g. `import { transactionsApi } from '@/lib/api/transactions'`).

**E4.2 — Favorites/Pins Backend Migration**

Add `pinnedTransactionIds: string[]` and `favoritePatterns: FavoritePattern[]` to the `Settings` schema (or a new `UserPreferences` document). This enables:
- Cross-device sync
- Exact ID-based pin matching (no structural mismatch)
- Favorite quick-filter works on historical transactions

Current localStorage keys to migrate:
- `expenseiq_pinned_transactions` → `Settings.pinnedTransactionIds`
- `expenseiq_favorite_transactions` → `Settings.favoritePatterns` (or new `Favorites` collection)

**E4.3 — Transaction Grouping Enhancements**

`groupByDate` currently uses client-side date comparison. For large datasets, consider server-side aggregation endpoints returning pre-grouped summaries.

**E4.4 — Settings Domain Split**

The current `Settings` document is a catch-all. Recommended split:
- `UserPreferences` — theme, density, widget order (client-only or lightweight backend)
- `FinancialConfig` — categories, payment methods, subcategory map (backend, profile-scoped)
- `UserPreferences` can remain localStorage-backed until cross-device sync is needed

## Risks to Avoid During Backend Separation

1. **Never invalidate `settings.all`** — always use `settings.one(profileId)` to avoid cross-profile cache pollution
2. **Optimistic updates are required** for Settings mutations — the UI must reflect changes before the server responds (already implemented in `useCategories`, `useSubcategories`, `usePaymentMethods`)
3. **localStorage keys are now profile-scoped** via `lsProfileKey(base, profileId)` — format: `{base}__{profileId}`. Old unscoped keys (`expenseiq_pinned_transactions`, etc.) are orphaned on first profile switch; a one-time migration helper can be added in E4.3 if needed
4. **`transactionsApi.bulkCreate` and `bulkDelete`** use non-standard endpoints — verify backend route stability before E4.3
5. **`client.ts` barrel must not be removed** until all consumers are migrated to domain imports
6. **Settings merge safety** is now client-side best-effort via `useMergeSettings` — the definitive fix is a backend PATCH endpoint that merges fields server-side (E4.3 direction)

## Profile-Aware Persistence Strategy (E4.2)

All client-side localStorage keys are now scoped by `profileId` using `lsProfileKey(base, profileId)`:

| Old key | New key pattern |
|---|---|
| `expenseiq_pinned_transactions` | `expenseiq_pinned_transactions__{profileId}` |
| `expenseiq_favorite_transactions` | `expenseiq_favorite_transactions__{profileId}` |
| `expenseiq_transaction_templates` | `expenseiq_transaction_templates__{profileId}` |
| `expenseiq_table_density` | `expenseiq_table_density__{profileId}` |

**Backward compatibility:** Old unscoped keys are not automatically migrated. Users switching profiles for the first time will start with empty pins/favorites/templates for the new profile. This is acceptable for the current single-profile majority use case.

## Settings Merge Safety (E4.2)

`useMergeSettings()` hook reads the current React Query cache before every Settings mutation and merges the incoming partial update on top. This reduces (but does not eliminate) the concurrent overwrite window.

**Remaining risk:** If two mutations fire before either `onMutate` runs, both will read the same stale cache. The definitive fix is a backend `PATCH /settings` endpoint that merges fields atomically.

## Favorites Domain Preparation (E4.2)

`favoritesStorage.ts` centralizes:
- `FavoriteTransaction` type definition
- Profile-scoped key generation (`favoritesKey(profileId?)`)
- `loadFavorites(profileId?)` — sorted by usageCount + recency
- `saveFavoritesToStorage(favorites, profileId?)`
- `matchesFavorite(txn, favorites)` — structural match logic

Both `FavoriteTransactions.tsx` and `useFavoriteIds.ts` now import from this shared module.

## Recommended E4.3 Direction

**E4.3 — Persistence Consolidation + Settings Rationalization** ✅ COMPLETED

**E4.4 — Persistence Activation + Settings Domain Separation** ✅ COMPLETED

**E4.5 — FinancialConfig Backend Foundation** ✅ COMPLETED

**E4.6 — FinancialConfig Migration Completion** ✅ COMPLETED

**E4.7 — FinancialConfig Finalization** ✅ COMPLETED

**E4.8 — Templates Migration + Dead Code Cleanup** ✅ COMPLETED

**E4.9 — Favorites & Pins FinancialConfig Migration** ✅ COMPLETED

**E4.10 — Final Architecture Cleanup** ✅ COMPLETED

**E4.11 — Production Hardening & Operational Readiness** ✅ COMPLETED

**E4.12 — Release Readiness & Operational Excellence** ✅ COMPLETED

### Offline Awareness (E4.12)

- `src/lib/hooks/useNetworkStatus.ts` — `useNetworkStatus()` hook using `navigator.onLine` + event listeners
- `src/components/ui/OfflineBanner.tsx` — subtle amber banner shown when offline; disappears on reconnect
- `AppShell.tsx` — `OfflineBanner` rendered at top of layout

### Error Handling Wired (E4.12)

- `getApiErrorMessage` now wired into transactions page and budgets page `PageError` renders
- Error objects passed from React Query to the helper for status-code-aware messages

### Cache Strategy Finalized (E4.12)

| Hook | staleTime | Rationale |
|---|---|---|
| `useFinancialConfig` | 5 minutes | Changes infrequently |
| `useSettings` | 5 minutes | Changes infrequently |
| `useTransactions` | 30 seconds | Changes frequently |
| `useBudgets` | 30 seconds | Changes frequently |
| All others | 0 (default) | React Query default |

### Release Checklist (E4.12)

`RELEASE_CHECKLIST.md` created at project root. Covers:
- Pre-release validation (typecheck, lint, tests, build)
- Environment variable checklist
- Deployment sequence (migration → backend → frontend)
- Post-deployment smoke tests
- Rollback procedure
- Backup strategy
- Monitoring guidance

## E4 Program Completion Statement

The E4 enhancement program is complete. All planned phases have been delivered:

| Phase | Description | Status |
|---|---|---|
| E4.1 | Domain API Modularization | ✅ |
| E4.2 | Profile-Aware Persistence | ✅ |
| E4.3 | Persistence Consolidation | ✅ |
| E4.4 | Persistence Activation | ✅ |
| E4.5 | FinancialConfig Backend Foundation | ✅ |
| E4.6 | FinancialConfig Migration Completion | ✅ |
| E4.7 | FinancialConfig Finalization | ✅ |
| E4.8 | Templates Migration + Dead Code Cleanup | ✅ |
| E4.9 | Favorites & Pins Migration | ✅ |
| E4.10 | Final Architecture Cleanup | ✅ |
| E4.11 | Production Hardening | ✅ |
| E4.12 | Release Readiness | ✅ |

## Future Development Guidance

The architecture is stable and production-ready. Future work should:

1. **Stay within FinancialConfig** for any new financial configuration fields
2. **Use `financialConfigApi.patch`** for all financial config mutations
3. **Use `useFinancialConfig()`** for all financial config reads
4. **Keep Settings for UI preferences only** (theme, widgets)
5. **Follow the domain module pattern** in `src/lib/api/` for any new backend endpoints
6. **Run `migrateFinancialConfig.js`** after any new FinancialConfig field additions in production

### Error Handling (E4.11)

- `src/lib/utils/apiErrors.ts` — `getApiErrorMessage(error, fallback)` converts `ApiError` status codes to user-friendly messages; handles network errors (TypeError fetch)
- `PageError` component updated with optional `description` prop for additional context
- Budgets page now has `isError` + `PageError` + `refetch` (was missing)

### Performance (E4.11)

- `useFinancialConfig` — `staleTime: 5 minutes`; smarter retry (no retry on 404)
- `useSettings` — `staleTime: 5 minutes`; reduces redundant refetches across components

### Test Reliability (E4.11)

- `e3-enhancements.test.tsx` — fixed flaky `duplicateTransaction` date test; replaced exact date equality with field-by-field assertions and date format regex

### Export / Backup Strategy (E4.11)

- **Export**: `ImportExportModal` exports current month transactions as CSV via `transactionsToCSV` + `downloadCSV`
- **Import**: CSV import with validation via `parseTransactionsCSV`; shows valid/error counts before confirming
- **Backup strategy**: MongoDB Atlas automated backups (M10+); for M0 free tier, schedule periodic CSV exports
- **Recovery**: Re-import CSV; FinancialConfig can be re-populated via `scripts/migrateFinancialConfig.js`

### Production Environment (E4.11)

| Variable | Required | Default | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_API_BASE` | Yes | `http://localhost:5000/api` | Must point to production backend |
| `NEXT_PUBLIC_USE_MSW` | No | `false` | Never enable in production |
| `PORT` (backend) | No | `5000` | Set in deployment environment |
| `MONGODB_URI` (backend) | Yes | — | Atlas connection string |
| `CORS_ORIGIN` (backend) | Yes | localhost | Must include frontend origin |

## Production Rollout Checklist

### Pre-deployment
- [ ] `npm run build` succeeds with 0 errors
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes (183/183)
- [ ] `NEXT_PUBLIC_API_BASE` set to production backend URL
- [ ] `NEXT_PUBLIC_USE_MSW=false`
- [ ] Backend `CORS_ORIGIN` includes frontend domain

### Database
- [ ] Run `node scripts/migrateFinancialConfig.js` against production MongoDB
- [ ] Verify migration output: `{ migrated: N, skipped: 0, errors: 0 }`
- [ ] Confirm FinancialConfig documents exist for all profiles

### Deployment
- [ ] Deploy backend first (FinancialConfig endpoint must be live before frontend)
- [ ] Deploy frontend
- [ ] Smoke test: load transactions page, verify categories/payment methods load
- [ ] Smoke test: add a transaction, verify it saves
- [ ] Smoke test: pin a transaction, verify it persists on refresh

### Rollback
- [ ] Frontend rollback: redeploy previous frontend build (backend is additive, no rollback needed)
- [ ] If FinancialConfig endpoint is broken: frontend falls back to localStorage for pins/favorites
- [ ] Settings endpoint unchanged — theme/widgets unaffected by any FinancialConfig issue

### Settings Cleaned (E4.10)

`models/Settings.js` now owns only UI preferences:
- `theme`, `widgets`, `widgetOrder`
- Financial fields (`customExpenseCategories`, `customPaymentMethods`, `subcategoryMap`) removed
- Settings is now a clean `UserPreferences` document

### FinancialConfig Seed Simplified (E4.10)

`financialConfigService.get()` no longer reads from Settings on first call. Creates FinancialConfig with empty defaults. The `scripts/migrateFinancialConfig.js` script handles pre-population for existing profiles.

### Canonical Types (E4.10)

- `FavoriteTransaction` — single definition in `src/lib/types/api.ts`
- `FavoritePattern` — defined in `favoritesBackendReadiness.ts`
- `favoritesStorage.ts` re-exports `FavoriteTransaction` from `api.ts`; no duplicate definition

### localStorage Fallback Reduced (E4.10)

- `favoritesStorage.ts` — `saveFavoritesToStorage` removed (no callers); `FavoritePattern` removed; `loadFavorites` remains as fallback-only
- `pinnedStorage.ts` — `savePinnedIds` removed (no callers); `loadPinnedIds` remains as fallback-only

### useFinancialConfig Simplified (E4.10)

Settings fallback for financial fields removed. `useFinancialConfig()` now queries only `/api/financial-config`. No dual-read overhead. Settings query no longer fired by financial config hooks.

## Final Ownership Model (E4.10)

| Domain | Owner | Persistence |
|---|---|---|
| Categories (expense/income) | FinancialConfig | Backend MongoDB |
| Payment methods | FinancialConfig | Backend MongoDB |
| Subcategory map | FinancialConfig | Backend MongoDB |
| Transaction templates | FinancialConfig | Backend MongoDB |
| Favorite transactions | FinancialConfig | Backend MongoDB |
| Pinned transaction IDs | FinancialConfig | Backend MongoDB |
| Theme / widgets | Settings | Backend MongoDB |
| Table density | localStorage | Client-only |

## Production Rollout Checklist

1. **Deploy backend** — `ExpenseIQ-Backend` with new `FinancialConfig` model and routes
2. **Run migration script** — `node scripts/migrateFinancialConfig.js` against production MongoDB to pre-populate FinancialConfig for all existing profiles
3. **Verify migration** — check `{ migrated, skipped, errors }` output; errors should be 0
4. **Deploy frontend** — `expenseiq-frontend` with E4.10 changes
5. **Monitor** — watch for `/api/financial-config` 404s or 500s in the first 24h; the localStorage fallback ensures zero user disruption even if the endpoint is temporarily unavailable
6. **Rollback plan** — revert frontend to E4.5 (dual-read with Settings fallback); backend FinancialConfig endpoint is additive and does not break existing Settings consumers

### Favorites Migrated to FinancialConfig (E4.9)

- `favoriteTransactions: FavoriteTransaction[]` added to FinancialConfig model, service, validator
- `FavoriteTransactions.tsx` reads from `useFinancialConfig()`, writes via `financialConfigApi.patch`
- `useFavoriteIds.ts` derives from FinancialConfig cache; falls back to localStorage
- `FavoriteTransaction` interface moved to `src/lib/types/api.ts` (canonical location)
- `matchesFavorite` in `favoritesStorage.ts` widened to accept both type shapes

### Pins Migrated to FinancialConfig (E4.9)

- `pinnedTransactionIds: string[]` added to FinancialConfig model, service, validator
- `usePinnedTransactions.ts` reads from `useFinancialConfig()`, writes via `financialConfigApi.patch`
- Falls back to localStorage (`loadPinnedIds()`) before FinancialConfig query resolves

### localStorage Fallback Strategy (E4.9)

`favoritesStorage.ts` and `pinnedStorage.ts` remain as fallback helpers:
- Used for first-render before FinancialConfig query resolves
- Used as seed data if FinancialConfig has no records yet
- No longer the primary persistence layer

### FinancialConfig Ownership (E4.9 Final)

| Field | Owner | Status |
|---|---|---|
| `customExpenseCategories` | FinancialConfig | ✅ |
| `customIncomeCategories` | FinancialConfig | ✅ |
| `customPaymentMethods` | FinancialConfig | ✅ |
| `subcategoryMap` | FinancialConfig | ✅ |
| `transactionTemplates` | FinancialConfig | ✅ |
| `favoriteTransactions` | FinancialConfig | ✅ (E4.9) |
| `pinnedTransactionIds` | FinancialConfig | ✅ (E4.9) |
| `theme` / `widgets` | Settings | Remains in Settings |

## Recommended E4.10 Direction

1. **Remove financial fields from Settings schema** — `customExpenseCategories`/`customPaymentMethods`/`subcategoryMap` are no longer written to Settings; remove them from `models/Settings.js` and the Settings validator
2. **Remove localStorage as primary persistence** — `favoritesStorage.ts` and `pinnedStorage.ts` can be reduced to fallback-only helpers; the localStorage keys become orphaned naturally
3. **Settings becomes theme/widgets only** — the Settings document is now purely for UI preferences; consider renaming to `UserPreferences` in a future backend migration
4. **Run `migrateFinancialConfig.js` in production** — pre-populate FinancialConfig for all existing profiles to eliminate seed-on-first-GET latency

### Templates Migrated to FinancialConfig (E4.8)

`transactionTemplates: TransactionTemplate[]` added to FinancialConfig:
- Backend: `models/FinancialConfig.js` schema updated with `transactionTemplateSchema`
- Backend: `validators/financialConfig.js` updated with template Joi schema
- Backend: `services/financialConfigService.js` allows `transactionTemplates` in `$set`
- Frontend: `TransactionTemplate` interface added to `src/lib/types/api.ts`
- Frontend: `TransactionTemplatesModal` now reads from `useFinancialConfig()` and writes via `financialConfigApi.patch`
- Templates are now backend-persisted, profile-scoped, and cross-device

### Dead Code Removed (E4.8)

- `src/lib/hooks/useSettingsMerge.ts` — deleted (no callers)
- `src/lib/hooks/settingsPersistence.ts` — deleted (no callers)

### FinancialConfig Ownership (E4.8 Final)

FinancialConfig now owns all financial configuration:

| Field | Owner | Status |
|---|---|---|
| `customExpenseCategories` | FinancialConfig | ✅ Migrated |
| `customIncomeCategories` | FinancialConfig | ✅ Migrated |
| `customPaymentMethods` | FinancialConfig | ✅ Migrated |
| `subcategoryMap` | FinancialConfig | ✅ Migrated |
| `transactionTemplates` | FinancialConfig | ✅ Migrated (E4.8) |
| `theme` / `widgets` | Settings | Remains in Settings |
| `pinnedTransactionIds` | localStorage | Future E4.9 |
| `favoritePatterns` | localStorage | Future E4.9 |

## Recommended E4.9 Direction

1. **Remove financial fields from Settings writes** — stop including `customExpenseCategories`/`customPaymentMethods`/`subcategoryMap` in any Settings PUT calls; Settings becomes theme/widgets only
2. **Favorites backend persistence** — add `favoritePatterns: FavoritePattern[]` to FinancialConfig; update `favoritesStorage` to read/write via `financialConfigApi.patch`; `useFavoriteIds` becomes a derived selector from FinancialConfig cache
3. **Pins backend persistence** — add `pinnedTransactionIds: string[]` to FinancialConfig; update `pinnedStorage` to read/write via `financialConfigApi.patch`
4. **Run migration script in production** — `node scripts/migrateFinancialConfig.js` to pre-populate FinancialConfig for all existing profiles

### Backend Migration Script (E4.7)

`scripts/migrateFinancialConfig.js` — idempotent one-time migration:
- Reads all Settings documents via `.lean()` to capture ad-hoc financial fields
- Creates FinancialConfig for any profile that doesn't have one yet
- Skips profiles that already have FinancialConfig
- Returns `{ migrated, skipped, errors }` for observability
- Run: `node scripts/migrateFinancialConfig.js`

### Backend PATCH Support (E4.7)

`PATCH /api/financial-config` added alongside existing `PUT`:
- Same `$set` field-level semantics as PUT
- Correct HTTP verb for partial updates
- Validated by the same Joi schema
- Frontend mutations now use PATCH exclusively

### Settings Model Updated (E4.7)

Financial fields (`customExpenseCategories`, `customIncomeCategories`, `customPaymentMethods`, `subcategoryMap`) added explicitly to the Settings Mongoose schema with `default: undefined`. This ensures they are stored and retrievable for the migration script and fallback reads.

### Frontend PATCH Integration (E4.7)

- `financialConfigApi.patch()` added using `PATCH` HTTP method
- `RequestOptions.method` extended to include `'PATCH'` in `http.ts`
- All three mutation hooks (`useCategories`, `useSubcategories`, `usePaymentMethods`) now use `patch` instead of `update`
- `useUpdateFinancialConfig` also uses `patch`

### Deprecated Helpers (E4.7)

- `useMergeSettings` — no longer called by financial hooks; retained for potential theme/widgets mutations; safe to remove in E4.8 if no callers remain
- `settingsPersistence` (`applyOptimisticSettings`, `rollbackSettings`, `invalidateSettings`) — same status

## Recommended E4.8 Direction

1. **Remove financial fields from Settings writes** — stop including `customExpenseCategories`/`customPaymentMethods`/`subcategoryMap` in any Settings PUT calls; the Settings document becomes theme/widgets only
2. **Remove `useMergeSettings` and `settingsPersistence`** — once no callers remain, delete these helpers to reduce dead code
3. **Templates backend persistence** — add `transactionTemplates` to FinancialConfig; update `TransactionTemplatesModal` to read/write via `financialConfigApi.patch`
4. **Run migration script in production** — execute `node scripts/migrateFinancialConfig.js` against the production database to pre-populate FinancialConfig for all existing profiles, eliminating the seed-on-first-GET latency

### FinancialConfig Now Source of Truth (E4.6)

All three financial configuration hooks now read from and write to FinancialConfig exclusively:

| Hook | Read source | Write target |
|---|---|---|
| `useCategories` | `useFinancialConfig()` (dual-read) | `financialConfigApi.update` |
| `useSubcategories` | `useFinancialConfig()` (dual-read) | `financialConfigApi.update` |
| `usePaymentMethods` | `useFinancialConfig()` (dual-read) | `financialConfigApi.update` |

**Settings financial writes deprecated:** `useMergeSettings` is no longer called by any of the three hooks. Financial fields (`customExpenseCategories`, `customIncomeCategories`, `customPaymentMethods`, `subcategoryMap`) are no longer written to the Settings document.

**Dual-read fallback preserved:** `useFinancialConfig()` still falls back to Settings cache if the `/api/financial-config` endpoint is unavailable, ensuring zero disruption for existing users.

**Optimistic updates:** All three mutation hooks now target `queryKeys.financialConfig.one(profileId)` for optimistic cache updates. No merge helper needed — FinancialConfig uses `$set` semantics server-side.

### Settings Fallback Strategy (E4.6)

Settings remains the fallback read source via `useFinancialConfig()` dual-read. The Settings document is not modified for financial fields after E4.6. Existing data in Settings is preserved and readable as fallback.

### Rollback Strategy

To roll back E4.6: revert `useCategories`, `useSubcategories`, `usePaymentMethods` to their E4.5 versions (which used `useSettings` + `useMergeSettings`). No backend changes required.

### FinancialConfig Backend (E4.5)

New backend endpoint: `GET /api/financial-config` and `PUT /api/financial-config`

- `models/FinancialConfig.js` — Mongoose model with explicit fields
- `services/financialConfigService.js` — get (with Settings seed fallback) + update ($set semantics)
- `controllers/financialConfigController.js` — thin controller
- `routes/financialConfig.js` — Express router
- `validators/financialConfig.js` — Joi schema
- Registered in `server.js` and `tests/helpers/app.js`

**Backward compatibility:** On first GET, if no FinancialConfig document exists, the service seeds from the existing Settings document. Existing `/api/settings` endpoint is unchanged.

### FinancialConfig Frontend (E4.5)

- `src/lib/api/financialConfig.ts` — `financialConfigApi` domain module
- `src/lib/hooks/useFinancialConfig.ts` — `useFinancialConfig()` + `useUpdateFinancialConfig()` hooks
- `queryKeys.financialConfig.one(profileId)` added to keys.ts
- `api.getFinancialConfig` / `api.updateFinancialConfig` added to client.ts barrel

**Dual-read compatibility:** `useFinancialConfig()` prefers the `/api/financial-config` endpoint. If it fails or returns no data, it falls back to the Settings cache. The `source` field indicates which was used.

### FinancialConfig Tests (E4.5)

- `tests/services/financialConfigService.test.js` — 6 service unit tests
- `tests/baseline/financialConfig.test.js` — 5 API integration tests
- All 218 backend tests pass (11 new)

## Recommended E4.7 Direction

1. **Backend one-time migration script** — copy `customExpenseCategories`/`customPaymentMethods`/`subcategoryMap` from all existing Settings documents into FinancialConfig documents for profiles that haven't yet triggered the seed-on-first-GET path
2. **Backend PATCH for FinancialConfig** — replace full PUT with field-level PATCH to eliminate any remaining concurrent overwrite risk; the frontend `$set` semantics already prepare for this
3. **Remove financial fields from Settings schema** — once all profiles have FinancialConfig documents, remove `customExpenseCategories`/`customIncomeCategories`/`customPaymentMethods`/`subcategoryMap` from the Settings Mongoose schema and validator
4. **Templates backend persistence** — add `transactionTemplates` to FinancialConfig (or a dedicated collection); update `TransactionTemplatesModal` to read/write via `financialConfigApi`
5. **Clean up `useMergeSettings`** — now only needed for Settings theme/widgets mutations; can be simplified or removed if those fields also migrate

`migrateUnscopedPersistence(profileId)` is now called in `AppShell.tsx` via `useEffect` on mount. It runs once per profile, is idempotent, and is non-blocking (no await in the render path).

### Settings Domain Separation (E4.4)

Two new domain type interfaces added to `src/lib/types/api.ts` (additive, no breaking changes):

```ts
interface FinancialConfig {
  profileId, customExpenseCategories, customIncomeCategories,
  customPaymentMethods, subcategoryMap
}

interface UserPreferences {
  profileId, theme, widgets, widgetOrder
}
```

These define the future split of the `Settings` catch-all document. No backend changes yet.

### Favorites Backend Readiness (E4.4)

`favoritesBackendReadiness.ts` provides:
- `favoriteTransactionToPattern(fav)` — extracts `FavoritePattern` from full record
- `favoritesToPatterns(favorites)` — batch conversion
- `patternMatchesTxn(pattern, txn)` — match check against minimal pattern
- `patternToFavoriteTransaction(pattern, overrides?)` — reconstruct full record from pattern

### Pinned Transactions Backend Readiness (E4.4)

`pinnedBackendReadiness.ts` provides:
- `PinnedTransactionRef` DTO `{ transactionId, pinnedAt }`
- `pinnedIdsToRefs(ids)` — converts plain IDs to richer refs
- `refsToIds(refs)` — extracts IDs from refs

## Settings Ownership Audit (E4.4 Final)

| Field | Current location | Domain | Future location |
|---|---|---|---|
| `customExpenseCategories` | Settings (backend) | FinancialConfig | Backend FinancialConfig |
| `customIncomeCategories` | Settings (backend) | FinancialConfig | Backend FinancialConfig |
| `customPaymentMethods` | Settings (backend) | FinancialConfig | Backend FinancialConfig |
| `subcategoryMap` | Settings (backend) | FinancialConfig | Backend FinancialConfig |
| `theme` | Settings (backend) | UserPreferences | Backend UserPreferences |
| `widgets` / `widgetOrder` | Settings (backend) | UserPreferences | Backend UserPreferences |
| `pinnedTransactionIds` | localStorage (profile-scoped) | Pins domain | Backend Settings or Pins collection |
| `favoritePatterns` | localStorage (profile-scoped) | Favorites domain | Backend Settings or Favorites collection |
| `transactionTemplates` | localStorage (profile-scoped) | Templates domain | Backend Settings or Templates collection |
| `tableDensity` | localStorage (profile-scoped) | UserPreferences | localStorage (no sync needed) |

## Recommended E4.5 Direction

1. **Backend FinancialConfig split** — create a dedicated `FinancialConfig` document/collection in the backend; migrate `customExpenseCategories`, `customIncomeCategories`, `customPaymentMethods`, `subcategoryMap` out of `Settings`; update `useCategories`, `useSubcategories`, `usePaymentMethods` to use the new endpoint
2. **Favorites backend persistence** — add `favoritePatterns: FavoritePattern[]` to `Settings` (or new collection); update `favoritesStorage` to read/write via `settingsApi`; use `favoritesBackendReadiness.ts` conversion helpers for the migration
3. **Pins backend persistence** — add `pinnedTransactionIds: string[]` to `Settings`; update `pinnedStorage` to read/write via `settingsApi`; use `pinnedBackendReadiness.ts` for the migration
4. **Backend PATCH for Settings** — replace full PUT with field-level PATCH to eliminate the concurrent overwrite race condition in `useMergeSettings`
