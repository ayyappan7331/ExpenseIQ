# ExpenseIQ — Deployment Guide

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend       │────▶│  MongoDB Atlas  │
│   (Vercel)      │     │   (Render)      │     │   (M0 Free)    │
│   Next.js 16    │     │   Express       │     │                 │
│   Port: 443     │     │   Port: 443     │     │   Port: 27017   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Step 1: MongoDB Atlas Setup

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a free M0 cluster (or use existing)
3. Create a database user: `Database Access` → `Add New Database User`
4. Whitelist IPs: `Network Access` → `Add IP Address` → `Allow Access from Anywhere` (0.0.0.0/0) for Render
5. Get connection string: `Connect` → `Connect your application` → Copy the URI
6. Replace `<password>` with your database user's password

Example:
```
mongodb+srv://expenseiq:<password>@cluster0.xxxxx.mongodb.net/expenseiq?retryWrites=true&w=majority
```

---

## Step 2: Backend Deployment (Render)

### 2.1 Create Render Web Service

1. Go to [render.com](https://render.com) → New → Web Service
2. Connect your GitHub repo (ExpenseIQ-Backend)
3. Configure:
   - **Name**: `expenseiq-backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start` (or `node server.js`)
   - **Plan**: Free

### 2.2 Set Environment Variables

| Variable | Value |
|---|---|
| `MONGO_URI` | `mongodb+srv://expenseiq:<password>@cluster0.xxxxx.mongodb.net/expenseiq?retryWrites=true&w=majority` |
| `PORT` | `10000` (Render assigns this automatically) |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | `https://your-frontend.vercel.app` |
| `RATE_LIMIT_MAX` | `300` |
| `AUTH_ENABLED` | `false` (unless you want auth) |

### 2.3 Verify

After deploy, visit: `https://expenseiq-backend.onrender.com/api/health`

Expected response:
```json
{"status":"ok","timestamp":"2026-05-23T..."}
```

---

## Step 3: Frontend Deployment (Vercel)

### 3.1 Create Vercel Project

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo (expenseiq-frontend)
3. Framework: Next.js (auto-detected)
4. Build settings (auto-detected):
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### 3.2 Set Environment Variables

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_BASE` | `https://expenseiq-backend.onrender.com/api` |

⚠️ **Important**: `NEXT_PUBLIC_*` variables are inlined at build time. After changing them, you must redeploy.

### 3.3 Verify

After deploy, visit: `https://your-frontend.vercel.app/dashboard`

---

## Step 4: CORS Configuration

The backend must allow the frontend origin. Set `CORS_ORIGIN` on the backend:

```bash
# Single origin
CORS_ORIGIN=https://your-frontend.vercel.app

# Multiple origins (comma-separated)
CORS_ORIGIN=https://your-frontend.vercel.app,http://localhost:3000
```

If `CORS_ORIGIN` is unset, the backend defaults to allowing any localhost port (dev-friendly but not production-safe).

---

## Step 5: Post-Deployment Validation

Run through this checklist:

- [ ] `/api/health` returns `{"status":"ok"}`
- [ ] Frontend loads at production URL
- [ ] Dashboard shows data (or empty state if fresh DB)
- [ ] Add a transaction → appears in list
- [ ] Edit a transaction → updates correctly
- [ ] Delete a transaction → removed from list
- [ ] Switch themes → all pages recolor
- [ ] Switch profiles → data changes
- [ ] Export CSV → file downloads
- [ ] Import CSV → transactions appear
- [ ] Mobile responsive → sidebar collapses
- [ ] No console errors in browser DevTools

---

## Environment Variable Reference

### Frontend (.env.local / Vercel)

| Variable | Required | Example |
|---|---|---|
| `NEXT_PUBLIC_API_BASE` | Yes | `https://expenseiq-backend.onrender.com/api` |
| `NEXT_PUBLIC_USE_MSW` | No | `false` |

### Backend (Render)

| Variable | Required | Example |
|---|---|---|
| `MONGO_URI` | Yes | `mongodb+srv://...` |
| `PORT` | No | Auto-assigned by Render |
| `NODE_ENV` | Yes | `production` |
| `CORS_ORIGIN` | Yes | `https://your-frontend.vercel.app` |
| `RATE_LIMIT_MAX` | No | `300` |
| `RATE_LIMIT_WINDOW_MS` | No | `60000` |
| `AUTH_ENABLED` | No | `false` |
| `JWT_SECRET` | If auth | Random 32+ char string |
| `LOG_LEVEL` | No | `info` |

---

## Localhost Development (unchanged)

```bash
# Terminal 1: Backend
cd ExpenseIQ-Backend
npm run dev
# → http://localhost:5000/api/health

# Terminal 2: Frontend
cd expenseiq-frontend
npm run dev
# → http://localhost:3000
```

No environment changes needed for localhost — defaults work out of the box.

---

## Troubleshooting

| Issue | Cause | Fix |
|---|---|---|
| CORS error in browser | Backend doesn't allow frontend origin | Set `CORS_ORIGIN` to frontend URL |
| "Failed to fetch" | Backend not running or wrong URL | Check `NEXT_PUBLIC_API_BASE` |
| Data not loading | MongoDB connection failed | Check `MONGO_URI` and Atlas network access |
| Stale data after env change | `NEXT_PUBLIC_*` is build-time | Redeploy frontend after changing |
| Render cold start (30s) | Free tier spins down after inactivity | First request after idle is slow; normal |
| 503 on /api/health | MongoDB unreachable | Check Atlas IP whitelist (0.0.0.0/0) |

---

## Cost

| Service | Plan | Cost |
|---|---|---|
| Vercel | Hobby | Free |
| Render | Free | Free (750 hrs/month) |
| MongoDB Atlas | M0 | Free (512MB) |

**Total: $0/month** for personal use.

---

## Optional: Custom Domain

1. Add domain in Vercel: Settings → Domains → Add
2. Update DNS: CNAME to `cname.vercel-dns.com`
3. Update backend `CORS_ORIGIN` to include the custom domain
4. Redeploy backend
