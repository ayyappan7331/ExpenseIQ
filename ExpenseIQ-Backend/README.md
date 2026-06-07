# ExpenseIQ Backend

Express + Mongoose REST API for the ExpenseIQ personal-finance app. Multi-profile, single-tenant, localhost-oriented.

## Stack
- Node.js + Express 4
- MongoDB via Mongoose 8
- Tests: Jest + Supertest + mongodb-memory-server (in-memory, isolated; never touches Atlas)

## Setup
```
npm install
cp .env.example .env     # then edit values
npm run dev              # nodemon
# or
npm start                # plain node
```

Server listens on `http://localhost:${PORT}` (default `5000`). All routes are mounted under `/api`.

## Scripts
| Script           | Purpose                                            |
|------------------|----------------------------------------------------|
| `npm run dev`    | Start with nodemon (live reload)                   |
| `npm start`      | Start with plain node                              |
| `npm run seed`   | Run `utils/seed.js` (writes to whatever DB `.env` points at — be careful) |
| `npm test`       | Run baseline tests against in-memory MongoDB       |

## Project layout
```
config/         db connection
controllers/    request handlers (one per resource)
middleware/     errorHandler
models/         Mongoose schemas
routes/         Express routers
utils/          seed.js, api-client.js (frontend helper)
tests/          baseline API tests (Phase 0)
server.js       entry point
```

## API reference

All requests / responses are JSON. Errors use shape `{ "error": "<message>" }`. Resources are scoped by `profileId` (query for GETs, body for writes). When omitted, `profileId` defaults to `"default"`.

### Health
| Method | Path           | Notes                                       |
|--------|----------------|---------------------------------------------|
| GET    | `/api/health`  | Returns `{ status: "ok", timestamp: ISO }`  |

### Transactions
Document fields: `profileId`, `type` (`"income"`|`"expense"`), `amount`, `category`, `source`, `date` (string), `paymentMethod`, `notes`, `createdAt`, `updatedAt`.

| Method | Path                                | Body / Query                                  | Response                  |
|--------|-------------------------------------|-----------------------------------------------|---------------------------|
| GET    | `/api/transactions`                 | `?profileId=&month=YYYY-MM`                   | `200` Transaction[]       |
| POST   | `/api/transactions`                 | Transaction                                   | `201` Transaction         |
| POST   | `/api/transactions/bulk`            | Transaction[]                                 | `201` Transaction[]       |
| PUT    | `/api/transactions/:id`             | Partial Transaction                           | `200` Transaction \| `404`|
| DELETE | `/api/transactions/:id`             | —                                             | `200 { message }` \| `404`|
| POST   | `/api/transactions/bulk-delete`     | `{ ids: string[] }`                           | `200 { message }`         |

### Subscriptions
Fields: `profileId`, `name`, `amount`, `cycle` (`"monthly"`|`"quarterly"`|`"yearly"`), `due`, `category`, `active`.

| Method | Path                          | Notes                              |
|--------|-------------------------------|------------------------------------|
| GET    | `/api/subscriptions`          | `?profileId=`, sorted by `due` asc |
| POST   | `/api/subscriptions`          | `201`                              |
| PUT    | `/api/subscriptions/:id`      | `200` \| `404`                     |
| DELETE | `/api/subscriptions/:id`      | `200` \| `404`                     |

### Debts
Fields: `profileId`, `type` (`"lent"`|`"borrowed"`), `person`, `amount`, `note`, `date`, `settled`, `settledDate`.

| Method | Path                | Notes                                   |
|--------|---------------------|-----------------------------------------|
| GET    | `/api/debts`        | `?profileId=`, sorted by `createdAt` desc |
| POST   | `/api/debts`        | `201`                                   |
| PUT    | `/api/debts/:id`    | `200` \| `404`                          |
| DELETE | `/api/debts/:id`    | `200` \| `404`                          |

### Goals (monthly savings goal — one per `profileId+month`)
Fields: `profileId`, `month` (`YYYY-MM`), `amount`.

| Method | Path             | Notes                                                         |
|--------|------------------|---------------------------------------------------------------|
| GET    | `/api/goals`     | `?profileId=`                                                 |
| POST   | `/api/goals`     | Upsert on `(profileId, month)`. Returns `200` Goal.           |
| DELETE | `/api/goals/:id` | `200` \| `404`                                                |

### Profiles
Fields: `profileId`, `name`, `icon`, `isDefault`.

| Method | Path                 | Notes                                                                                  |
|--------|----------------------|----------------------------------------------------------------------------------------|
| GET    | `/api/profiles`      | Returns all profiles. If none exist, creates a `Personal` default profile.             |
| POST   | `/api/profiles`      | `201` Profile                                                                          |
| DELETE | `/api/profiles/:id`  | **Cascade deletes** all child docs across 7 collections. `default` profile is protected. |

### Credit Cards
Fields: `profileId`, `name`, `billDate` (1–31), `dueDate` (1–31), `limit`, `color`.

| Method | Path                       | Notes                |
|--------|----------------------------|----------------------|
| GET    | `/api/creditcards`         | `?profileId=`        |
| POST   | `/api/creditcards`         | `201`                |
| PUT    | `/api/creditcards/:id`     | `200` \| `404`       |
| DELETE | `/api/creditcards/:id`     | `200` \| `404`       |

### Settings (one per profile)
Fields: `profileId`, `theme`, `widgets[]`, `widgetOrder[]`.

| Method | Path                       | Notes                                                                                   |
|--------|----------------------------|-----------------------------------------------------------------------------------------|
| GET    | `/api/settings`            | `?profileId=`. Auto-creates default settings if missing.                                |
| PUT    | `/api/settings`            | Upsert. Returns updated settings.                                                       |
| GET    | `/api/settings/db-stats`   | Returns DB usage stats (dataSize, indexSize, storageSize, …) plus M0 free-tier cap.     |

### Budgets (one per `profileId+month+category`)
Fields: `profileId`, `month` (`YYYY-MM`), `category`, `amount`.

| Method | Path                | Notes                                                              |
|--------|---------------------|--------------------------------------------------------------------|
| GET    | `/api/budgets`      | `?profileId=&month=YYYY-MM`                                        |
| POST   | `/api/budgets`      | Upsert on `(profileId, month, category)`. Requires all three + amount. |
| DELETE | `/api/budgets/:id`  | `200` \| `404`                                                     |

## Input validation (Phase 3+)

POST / PUT / bulk routes are validated against Joi schemas under [validators/](validators/).

Mode is controlled by `VALIDATION_MODE`:

| Value      | Behavior                                                                                       |
|------------|------------------------------------------------------------------------------------------------|
| `shadow` (default) | Validate, log mismatches to `console.warn`, **forward request to controller anyway**. Backward-compatible. |
| `enforce`  | Validate, return `400 { error: "<joi message>" }` on mismatch. Controller never runs.          |

Recommended migration: keep `shadow` while you exercise the frontend; review the `[validation:shadow]` warnings in the server log; fix any client payloads that need fixing; then flip to `enforce` in your `.env`.

## Security baseline (Phase 4)

| Layer | Implementation | Configurable via |
|---|---|---|
| Headers | `helmet()` with `Cross-Origin-Resource-Policy: cross-origin` (so a browser frontend on a different port can read responses) | — |
| CORS | Allowlist; default permits any `http(s)://localhost:*` / `127.0.0.1:*`. No-origin requests (curl, server-to-server) always pass. | `CORS_ORIGIN` (comma-separated list) |
| Rate limit | `express-rate-limit` mounted on `/api`; **300 req / 60 s / IP** by default. Returns `429 { error: "Too many requests" }`. | `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS` |
| Body size | `express.json({ limit: '10mb' })` — unchanged from day 0. | — |

To lock the dev server to a single frontend origin:

```
CORS_ORIGIN=http://localhost:5500
```

To loosen the rate limit during a load test:

```
RATE_LIMIT_MAX=10000
```

## TypeScript (Phase 10, incremental)

The codebase is mixed `.js` + `.ts`. `tsconfig.json` is set up with `allowJs: true` and `checkJs: false`, so existing `.js` files keep working while individual files migrate one at a time.

```powershell
npm run typecheck   # tsc --noEmit, type-checks all .ts files
npm test            # ts-jest transforms .ts on the fly; .js stays native
npm run dev         # nodemon + node -r ts-node/register so .ts requires resolve
```

Conversion order recommended by the roadmap: **models → controllers → services → routes**, one file per PR. Shared DTOs live in [types/api.ts](types/api.ts). Demonstrated conversions in this phase:

- [utils/httpError.ts](utils/httpError.ts)
- [utils/asyncHandler.ts](utils/asyncHandler.ts)
- [models/Goal.ts](models/Goal.ts)

Existing `.js` requires (`require('../utils/httpError')`) still work because the converted files use `export = ` for CommonJS compatibility.

## Test depth, coverage & pre-commit hooks (Phase 9)

### Coverage

```powershell
npm run test:coverage
```

Writes `coverage/lcov.info` + an HTML report at `coverage/lcov-report/index.html`. Thresholds are enforced by Jest — the command exits non-zero if coverage drops below them:

| Scope | statements | branches | functions | lines |
|---|---|---|---|---|
| global | 75 | 70 | 80 | 75 |
| `services/` | 85 | 75 | 90 | 85 |
| `controllers/` | 90 | 70 | 95 | 90 |

Files excluded from coverage: `utils/api-client.js` (browser code) and `utils/seed.js` (CLI script).

### Pre-commit hooks

`husky` and `lint-staged` are configured but **not auto-installed** because this repo isn't currently a git repo. One-time activation (after `git init`):

```powershell
git init
npm install            # picks up husky+lint-staged
npx husky init         # creates .git/hooks/* shims
```

After that, every `git commit` runs ESLint --fix + Prettier on staged `.js/.json/.md` files (config in [package.json](package.json) under `"lint-staged"`). The committed pre-commit script lives at [.husky/pre-commit](.husky/pre-commit).

## Authentication (Phase 7, gated)

Off by default. The existing frontend keeps working unchanged.

| AUTH_ENABLED | Behavior |
|---|---|
| unset / `false` (default) | All `/api/*` routes work without a token, exactly like before. Register/login endpoints are still callable for testing but no other route enforces auth. |
| `true` | Every `/api/*` route requires `Authorization: Bearer <jwt>`. Exceptions: `/api/health` and `/api/auth/*` (register, login) — always public so a frontend can bootstrap. |

### Endpoints

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/auth/register` | `{ email, password }` (password ≥ 8 chars) | `201 { id, email }` |
| POST | `/api/auth/login` | `{ email, password }` | `200 { token, user: { id, email } }` |

Errors: `400` on validation, `400` on duplicate email, `401` on bad credentials, `401` on missing/invalid token.

### Quick local test

```powershell
$env:AUTH_ENABLED = 'true'
$env:JWT_SECRET   = 'dev-secret-do-not-use-in-prod'
npm run dev

# In another shell:
$body = @{ email='user@example.com'; password='hunter2hunter2' } | ConvertTo-Json
$reg  = Invoke-RestMethod -Method POST -Uri http://localhost:5000/api/auth/register -Body $body -ContentType 'application/json'
$auth = Invoke-RestMethod -Method POST -Uri http://localhost:5000/api/auth/login    -Body $body -ContentType 'application/json'
$token = $auth.token
Invoke-RestMethod -Uri http://localhost:5000/api/transactions -Headers @{ Authorization = "Bearer $token" }
```

Profile-ownership binding (each profile owned by a user) is **not** implemented in this phase — it requires coordinated frontend changes that would violate "frontend stays unchanged". Deferred to a follow-up.

## Date migration (Phase 6)

`Transaction.date` and `Debt.date` are now native `Date` types (stored as UTC midnight). The wire format is unchanged — every response still serializes these fields back to `YYYY-MM-DD` strings via a schema-level `toJSON` transform. New `Transaction` documents accept the same `YYYY-MM-DD` request body the frontend has always sent.

For an existing database that still has string dates, use the migration script. **It defaults to dry-run; you must pass `--apply` to actually write.**

```powershell
# Before anything: mongodump your DB.
mongodump --uri="$env:MONGO_URI" --out=./backup-pre-phase6

# 1) Dry-run forward conversion (no writes)
npm run migrate:dates

# 2) Actually convert
npm run migrate:dates:apply

# 3) (Emergency only) revert dates back to strings
npm run migrate:dates:reverse

# Granular: only one collection
node utils/migrate-dates.js --apply --collection=debts
```

The script is idempotent — running it twice has no second-pass effect.

## Testing

Tests run against an isolated in-memory MongoDB (mongodb-memory-server). They never touch the configured `MONGO_URI`.

```
npm test                # run baseline tests
npm test -- -u          # update snapshots if you intentionally change behavior
```

Baseline snapshots live in `tests/baseline/__snapshots__/`. Any unintended diff is a regression signal.

## Migration phases
See conversation notes — Phase 0 is the safety net (this PR). Subsequent phases are listed in the roadmap.
