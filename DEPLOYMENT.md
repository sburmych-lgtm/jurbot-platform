# ЮрБот Deployment Guide

## Prerequisites

- Node.js 24+ and npm 11+
- PostgreSQL 15+
- Git

## Local Development Setup

```bash
# Clone
git clone https://github.com/sburmych-lgtm/jurbot-platform.git
cd jurbot-platform

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your local values

# Generate Prisma client
npx prisma generate --schema packages/db/prisma/schema.prisma

# Run database migrations
npx prisma migrate dev --schema packages/db/prisma/schema.prisma

# Seed sample data
npx prisma db seed --schema packages/db/prisma/schema.prisma

# Start development servers
npm run dev
```

Backend runs on `http://localhost:3000`, frontend on `http://localhost:5173`.

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/jurbot` |
| `JWT_SECRET` | Access token signing key (32+ chars) | `your-secure-jwt-secret-here` |
| `JWT_REFRESH_SECRET` | Refresh token signing key (32+ chars) | `your-secure-refresh-secret-here` |
| `JWT_ACCESS_EXPIRY` | Access token TTL | `15m` |
| `JWT_REFRESH_EXPIRY` | Refresh token TTL | `7d` |
| `BCRYPT_ROUNDS` | Password hashing rounds | `12` |
| `PORT` | Backend server port | `3000` |
| `NODE_ENV` | Environment | `production` |
| `FRONTEND_URL` | Frontend origin for CORS | `https://your-frontend.railway.app` |
| `TELEGRAM_BOT_TOKEN_LAWYER` | Lawyer bot token from BotFather | _provide later_ |
| `TELEGRAM_BOT_TOKEN_CLIENT` | Client bot token from BotFather | _provide later_ |
| `TELEGRAM_WEBHOOK_SECRET` | Shared secret for webhook verification | `random-secret-string` |
| `TELEGRAM_WEBHOOK_URL` | Backend public URL for webhooks | `https://your-backend.railway.app` |
| `UPLOAD_DIR` | File upload directory | `./uploads` |
| `MAX_FILE_SIZE` | Max upload size in bytes | `10485760` (10MB) |

## Railway Deployment

### Step 1: Create Project

1. Go to [railway.com/new](https://railway.com/new)
2. Select **Empty Project**
3. Rename the project to `jurbot-platform`

### Step 2: Add PostgreSQL

1. Click **+ New** in the project canvas
2. Select **Database** → **PostgreSQL**
3. Wait for provisioning — Railway auto-generates `DATABASE_URL`

### Step 3: Add Backend Service

1. Click **+ New** → **GitHub Repository** → select `sburmych-lgtm/jurbot-platform`
2. In service settings:
   - **Root Directory**: `apps/backend`
   - **Build Command**: `cd ../.. && npm install && npx prisma generate --schema packages/db/prisma/schema.prisma && npm run build -w packages/shared && npm run build -w packages/db && npm run build -w apps/backend`
   - **Start Command**: `node dist/index.js`
3. Add environment variables (see table above)
4. Reference the PostgreSQL `DATABASE_URL` from the database service

### Step 4: Add Frontend Service

1. Click **+ New** → **GitHub Repository** → select `sburmych-lgtm/jurbot-platform`
2. In service settings:
   - **Root Directory**: `/`
   - **Build Command**: `npm install && npm run build -w packages/shared && npm run build -w apps/web`
   - **Publish Directory**: `apps/web/dist`
3. Set `NODE_ENV=production`

### Step 5: Run Migrations

In the backend service shell (Railway dashboard → service → **Shell**):

```bash
npx prisma migrate deploy --schema packages/db/prisma/schema.prisma
npx prisma db seed --schema packages/db/prisma/schema.prisma
```

### Step 6: Verify

- Health check: `GET https://<backend-url>/api/health` → `{ "status": "ok" }`
- Frontend: visit the frontend URL, confirm login page loads

## Build Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all dev servers |
| `npm run build` | Production build (all packages) |
| `npm run typecheck` | TypeScript strict check |
| `npm test` | Run test suite |
| `npx prisma studio` | Visual database browser |
| `npx prisma migrate dev` | Create and run migrations |

## Health Check

```
GET /api/health
Response: { "status": "ok", "timestamp": "..." }
```

## Troubleshooting

**Build fails on Railway**: Ensure the build command includes `npm install` at the root level and builds shared packages first.

**Database connection errors**: Verify `DATABASE_URL` is correctly referenced from the PostgreSQL service. Railway provides this automatically via service references.

**CORS errors**: Set `FRONTEND_URL` to the exact frontend domain (with `https://`, no trailing slash).

**Prisma client not found**: Run `npx prisma generate` as part of the build command before building backend.

---

> **Note**: Railway deployment was attempted on 2026-03-10 but was blocked by a platform-wide incident ("Deploys have been paused temporarily"). Complete the deployment steps above when Railway resolves the issue.
