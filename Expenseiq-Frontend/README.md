# ExpenseIQ Frontend

Intelligent personal finance tracker — Next.js 16 + React 19 + TypeScript + Tailwind v4.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit NEXT_PUBLIC_API_BASE if your backend is not on localhost:5000

# 3. Start the backend (in the ExpenseIQ-Backend directory)
# cd ../ExpenseIQ-Backend && npm run dev

# 4. Start the frontend
npm run dev
# Open http://localhost:3000
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server (localhost:3000) |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm test` | Run all tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint |
| `npm run lint:fix` | ESLint with auto-fix |
| `npm run format` | Prettier format all files |
| `npm run format:check` | Check formatting without writing |

## Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── (app)/              # Route group with sidebar/topbar shell
│   │   ├── dashboard/      # Dashboard page + components
│   │   ├── transactions/   # Transactions CRUD + import/export
│   │   ├── analytics/      # Charts + insights
│   │   ├── goals/          # Savings goals
│   │   ├── budgets/        # Per-category budgets
│   │   ├── subscriptions/  # Recurring subscriptions
│   │   ├── debts/          # Lent/borrowed tracking
│   │   ├── creditcards/    # Credit card management
│   │   └── compare/        # Month-to-month comparison
│   ├── themes/             # Theme picker page
│   └── debug/              # API debug page (dev only)
├── components/
│   ├── ui/                 # 20+ reusable primitives
│   ├── charts/             # Chart.js wrappers
│   └── layout/             # Sidebar, Topbar, AppShell, ProfileManager
├── lib/
│   ├── api/                # Typed API client + profile helpers
│   ├── hooks/queries/      # React Query hooks + key factories
│   ├── types/              # TypeScript DTOs
│   └── utils/              # Date helpers, CSV import/export
├── styles/                 # Theme CSS variables (8 themes)
└── test/                   # MSW handlers, fixtures, render utils
```

## Key Patterns

- **Theme system**: CSS variables + `data-theme` attribute. 8 themes. No Tailwind `dark:` classes.
- **Data layer**: React Query with typed API client. Query key factories for cache invalidation.
- **Mutations**: Each module has a `mutations.ts` with hooks that handle API call + cache invalidation + toast.
- **Helpers**: Pure calculation functions separated from rendering (e.g., `dashboard/helpers.ts`).
- **Charts**: Chart.js via react-chartjs-2 with theme-reactive wrappers.

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_BASE` | Yes | `http://localhost:5000/api` | Backend API URL |
| `NEXT_PUBLIC_USE_MSW` | No | `false` | Enable mock API for offline dev |

## Deployment

### Prerequisites
- Node.js ≥ 20.12
- Backend running and accessible at `NEXT_PUBLIC_API_BASE`

### Production Build
```bash
npm run build
npm run start
```

### Docker (optional)
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
EXPOSE 3000
CMD ["npm", "start"]
```

### Checklist
- [ ] `NEXT_PUBLIC_API_BASE` points to production backend
- [ ] Backend CORS allows the frontend origin
- [ ] Backend rate limit is appropriate for expected traffic
- [ ] `npm run build` succeeds with 0 errors
- [ ] `npm test` passes all tests

## Troubleshooting

| Issue | Solution |
|---|---|
| CORS errors | Ensure backend `CORS_ORIGIN` includes the frontend URL |
| Blank page on load | Check `NEXT_PUBLIC_API_BASE` is correct and backend is running |
| Theme not persisting | Clear localStorage and refresh |
| Tests fail with "Unhandled request" | MSW handlers need updating for new endpoints |
| `EBADENGINE` warnings | Upgrade Node.js to ≥ 20.19 (non-blocking) |
