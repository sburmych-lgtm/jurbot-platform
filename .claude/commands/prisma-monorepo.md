---
name: prisma-monorepo
description: Manage Prisma database operations in the JurBot monorepo — generate client, create migrations, push schema, open studio, and seed data. Use this skill when the user changes the Prisma schema, adds new models, needs to run migrations, wants to open Prisma Studio, or encounters database-related errors. Triggers on "prisma", "migration", "schema change", "database model", "LawyerAvailability", "add model", "db push", or any Prisma/database operation.
---

# Prisma Monorepo Operations

Manage Prisma in the JurBot monorepo where the schema lives in `packages/db/prisma/schema.prisma` but is used across multiple workspaces.

## Schema location

```
packages/db/prisma/schema.prisma   — THE source of truth
packages/db/prisma/seed.ts         — Seed data script
packages/db/src/index.ts           — Re-exports PrismaClient + types
```

## Common operations

### After changing schema.prisma

Always run these steps in order:

**1. Generate the Prisma client:**
```bash
cd "G:/Веб-додатки/Юрбот/app_ЮрБот"
npx prisma generate --schema packages/db/prisma/schema.prisma
```

**2. Apply to database (choose one):**

Option A — Migration (for tracked, reversible changes):
```bash
npx prisma migrate dev --schema packages/db/prisma/schema.prisma --name <descriptive-name>
```

Option B — Push (for quick prototyping, matches Railway's deploy flow):
```bash
npx prisma db push --schema packages/db/prisma/schema.prisma
```

Note: Railway uses `prisma db push --accept-data-loss` in `railway.toml` preDeployCommand.

**3. Rebuild the db package:**
```bash
npm run build -w packages/db
```

**4. Verify downstream packages compile:**
```bash
npm run typecheck
```

### Re-export new models

If you added a new model (e.g., `LawyerAvailability`), ensure it's accessible to other workspaces:

**File: `packages/db/src/index.ts`**

Check that it re-exports the generated types:
```typescript
export { PrismaClient } from '@prisma/client';
export type { User, LawyerProfile, LawyerAvailability, ... } from '@prisma/client';
```

Or if using barrel export:
```typescript
export * from '@prisma/client';
```

### Open Prisma Studio

```bash
npx prisma studio --schema packages/db/prisma/schema.prisma
```

Opens at http://localhost:5555 — useful for inspecting data visually.

### Seed the database

```bash
cd "G:/Веб-додатки/Юрбот/app_ЮрБот"
npx tsx packages/db/prisma/seed.ts
```

Creates test lawyer + clients if they don't exist.

### Reset database (destructive!)

Only if the user explicitly requests it:
```bash
npx prisma migrate reset --schema packages/db/prisma/schema.prisma
```

This drops all data and re-runs all migrations + seed. Confirm with user first.

## Common schema patterns in this project

### Adding a new model

1. Define model in `schema.prisma` with proper relations
2. Add `@@index` for frequently queried fields
3. If enum needed, define it above the model
4. Generate + migrate + build + typecheck (steps above)
5. Create service in `apps/backend/src/services/`
6. Create routes in `apps/backend/src/routes/`
7. Add Zod schema in `packages/shared/src/schemas/`

### Adding a relation

1. Add relation fields to both models in schema
2. Check `onDelete` behavior (Cascade vs SetNull)
3. Generate + migrate
4. Update relevant services that query the related model

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `PrismaClientInitializationError` | Check DATABASE_URL in .env |
| `P2002 Unique constraint failed` | Duplicate data — check seed or test data |
| `P2003 Foreign key constraint failed` | Referenced record doesn't exist |
| `P2025 Record not found` | Stale data or wrong ID |
| `Cannot find module '.prisma/client'` | Run `npx prisma generate` |
| Migration drift | Run `prisma migrate diff` to compare |

## Environment

- **Local:** `.env` file at project root with `DATABASE_URL`
- **Railway:** `DATABASE_URL` set as env variable (Railway provides PostgreSQL)
- **Schema:** `packages/db/prisma/schema.prisma`
- **Client output:** `node_modules/.prisma/client/` (auto-generated)
