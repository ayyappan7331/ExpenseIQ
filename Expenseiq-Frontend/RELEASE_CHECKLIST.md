# ExpenseIQ — Release Checklist

## Pre-Release Validation

### Code Quality
- [ ] `npm run typecheck` — 0 errors
- [ ] `npm run lint` — 0 errors, 0 warnings
- [ ] `npm test` — all tests passing (183/183 frontend, 228/228 backend)
- [ ] `npm run build` — production build succeeds with 0 errors

### Environment
- [ ] `NEXT_PUBLIC_API_BASE` set to production backend URL (not localhost)
- [ ] `NEXT_PUBLIC_USE_MSW=false` (never enable MSW in production)
- [ ] Backend `MONGODB_URI` set to production Atlas connection string
- [ ] Backend `CORS_ORIGIN` includes the frontend production domain
- [ ] Backend `PORT` set appropriately (default 5000)

---

## Deployment Sequence

### Step 1 — Database Migration
```bash
# Run from ExpenseIQ-Backend directory
node scripts/migrateFinancialConfig.js
```
Expected output: `Migration complete: N migrated, 0 skipped, 0 errors`

Verify:
- [ ] `migrated` count matches number of existing profiles
- [ ] `errors` is 0
- [ ] FinancialConfig documents exist in MongoDB for all profiles

### Step 2 — Deploy Backend
- [ ] Deploy `ExpenseIQ-Backend` to production server
- [ ] Verify `GET /api/health` returns `{ status: "ok" }`
- [ ] Verify `GET /api/financial-config` returns 200
- [ ] Verify `GET /api/settings` returns 200 (backward compat)

### Step 3 — Deploy Frontend
- [ ] Run `npm run build` — confirm 0 errors
- [ ] Deploy `.next/` output to hosting provider
- [ ] Verify app loads at production URL
- [ ] Verify no console errors on initial load

---

## Post-Deployment Verification

### Smoke Tests
- [ ] Load dashboard — stats display correctly
- [ ] Load transactions page — transactions list loads
- [ ] Add a transaction — saves and appears in list
- [ ] Add a category — appears in transaction form immediately
- [ ] Pin a transaction — pin persists on page refresh
- [ ] Add a favorite — appears in Quick Access panel
- [ ] Export CSV — downloads correctly
- [ ] Offline banner — appears when network is disconnected

### API Connectivity
- [ ] `GET /api/transactions` returns data
- [ ] `GET /api/financial-config` returns categories/payment methods
- [ ] `PATCH /api/financial-config` saves changes
- [ ] `GET /api/settings` returns theme/widgets

---

## Rollback Procedure

### Frontend Rollback
1. Redeploy previous frontend build
2. No backend changes required (all backend changes are additive)

### Backend Rollback
1. Redeploy previous backend version
2. FinancialConfig collection remains in MongoDB (safe to keep)
3. Frontend will fall back to localStorage for pins/favorites if endpoint unavailable

### Data Recovery
1. Re-import transactions from CSV backup
2. Re-run `node scripts/migrateFinancialConfig.js` to restore FinancialConfig
3. Categories/payment methods can be re-entered via the UI

---

## Backup Strategy

### Automated
- MongoDB Atlas M10+: automated daily backups with point-in-time recovery
- MongoDB Atlas M0 (free): no automated backups — use manual CSV export

### Manual
- Export transactions monthly via Import/Export modal → Export CSV
- Store CSV files in a safe location (cloud storage, email to self)
- FinancialConfig (categories, templates, favorites) can be re-created via UI

### Recovery Time Objectives
- Transaction data: recoverable from CSV import
- FinancialConfig: recoverable via `migrateFinancialConfig.js` + manual re-entry
- Settings (theme/widgets): re-configurable in ~1 minute

---

## Monitoring

### Key Metrics to Watch (First 24h)
- `/api/financial-config` error rate (should be 0%)
- `/api/transactions` response time (should be < 500ms)
- Frontend JS errors in browser console
- MongoDB Atlas connection pool utilization

### Alert Thresholds
- Any 5xx error rate > 1% → investigate immediately
- Response time > 2s consistently → check MongoDB indexes
- `CORS_ORIGIN` errors → verify frontend domain in backend config
