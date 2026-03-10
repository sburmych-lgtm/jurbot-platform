# ЮрБот — Unified Legal Platform

A monorepo platform that unifies client intake, appointment scheduling, client portal, and document management for Ukrainian law firms. Supports two roles (Lawyer and Client) with Telegram bot integration.

## Features

- **Client Intake** — Multi-step wizard with lead scoring (HOT/WARM/COLD), 8 legal categories
- **Appointment Scheduling** — Calendar grid, time slot picker, reminders, free/paid consultations
- **Client Portal** — Case tracking with progress stages, checklist, real-time messaging
- **Document Management** — 8 templates with dynamic forms, document generation, upload/download
- **Role-Based Access** — Lawyer (full CRUD), Client (read-only own data)
- **JWT Authentication** — Access + refresh tokens, bcrypt hashing, httpOnly cookies
- **Telegram Integration** — Two bots (lawyer + client), webhook-ready endpoints
- **Ukrainian Locale** — All UI text in Ukrainian, custom date formatting

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 6, TailwindCSS v4, React Router 7, lucide-react |
| Backend | Express 5, TypeScript strict, Zod validation |
| Database | PostgreSQL, Prisma 6 |
| Auth | JWT (access + refresh), bcrypt |
| Telegram | Grammy (webhook mode) |
| Monorepo | npm workspaces |

## Project Structure

```
app_ЮрБот/
├── apps/
│   ├── web/              # React frontend (Vite)
│   │   └── src/
│   │       ├── components/   # UI, layout, auth, domain components
│   │       ├── pages/        # lawyer/, client/, public/, shared/
│   │       └── lib/          # API client, auth context, utils
│   └── backend/          # Express API server
│       └── src/
│           ├── routes/       # 11 route modules (44 endpoints)
│           ├── services/     # Business logic layer
│           ├── middleware/    # Auth, role, validation, error handling
│           └── utils/        # JWT, password, pagination helpers
├── packages/
│   ├── shared/           # Types, Zod schemas, constants, utils
│   ├── db/               # Prisma schema, client, seed
│   └── telegram/         # Bot config and handler placeholders
├── DEPLOYMENT.md         # Railway deployment guide
├── TELEGRAM_SETUP.md     # Telegram bot connection guide
└── .env.example          # All environment variables
```

## Quick Start

```bash
git clone https://github.com/sburmych-lgtm/jurbot-platform.git
cd jurbot-platform
npm install
cp .env.example .env     # Edit with your values

# Database setup
npx prisma generate --schema packages/db/prisma/schema.prisma
npx prisma migrate dev --schema packages/db/prisma/schema.prisma
npx prisma db seed --schema packages/db/prisma/schema.prisma

# Start development
npm run dev
```

Frontend: http://localhost:5173 | Backend: http://localhost:3000

### Seed Credentials

| Role | Email | Password | Portal Code |
|------|-------|----------|-------------|
| Lawyer | lawyer@jurbot.com | lawyer123 | — |
| Client | maria@example.com | client123 | 123456 |
| Client | ivan@example.com | client123 | 654321 |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all dev servers |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript strict check |
| `npm test` | Run test suite |
| `npm run dev:backend` | Backend only |
| `npm run dev:frontend` | Frontend only |

## API Endpoints

### Auth (`/api/auth`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/register` | Register new user |
| POST | `/login` | Login with email/password |
| POST | `/portal-login` | Client login with code |
| POST | `/refresh` | Refresh access token |
| GET | `/me` | Get current user |

### Cases (`/api/v1/cases`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List cases (filtered by role) |
| GET | `/:id` | Get case details |
| POST | `/` | Create case (lawyer) |
| PATCH | `/:id` | Update case (lawyer) |
| DELETE | `/:id` | Soft delete (lawyer) |

### Documents, Appointments, Intake, TimeLogs, Notifications
Full CRUD endpoints following the same pattern. See `apps/backend/src/routes/` for complete API.

### Health
| Method | Path | Response |
|--------|------|----------|
| GET | `/api/health` | `{ "status": "ok" }` |

### Telegram Webhooks
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/telegram/lawyer` | Lawyer bot webhook |
| POST | `/api/telegram/client` | Client bot webhook |

## Roles & Permissions

| Resource | Lawyer | Client |
|----------|--------|--------|
| Cases | Full CRUD | Read own |
| Documents | Full CRUD | Read own, upload |
| Appointments | Full CRUD | Book, view own |
| Intake | View all, manage | Submit |
| Time Logs | Full CRUD | — |
| Clients | View all | — |
| Notifications | All | Own |

## Telegram Integration

Two bots share one backend:
- **Lawyer Bot**: case updates, schedule, document alerts
- **Client Bot**: booking, case status, document upload, FAQ

See [TELEGRAM_SETUP.md](./TELEGRAM_SETUP.md) for connection instructions.

## Deployment

Target: Railway (PostgreSQL + backend + frontend).

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full deployment guide.

## License

MIT
