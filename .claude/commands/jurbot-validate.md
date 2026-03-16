---
name: jurbot-validate
description: Run full monorepo validation pipeline for JurBot — typecheck, tests, and build in correct workspace order. Use this skill after any code changes, before committing, or when the user asks to "check if it compiles", "run tests", "validate the build", "typecheck", or "does it build". Also triggers on "fix build errors", "fix type errors", or "compilation failed". Handles the correct dependency order for npm workspaces (shared → db → telegram → backend → web).
---

# JurBot Monorepo Validation

Run typecheck, tests, and build across all workspaces in the correct dependency order. Fix errors as you find them.

## Project structure

```
packages/shared   → no deps (build first)
packages/db       → depends on shared
packages/telegram → depends on db
apps/backend      → depends on shared, db, telegram
apps/web          → depends on shared
```

## Validation pipeline

### Step 1: Prisma client generation

Before anything else, ensure the Prisma client is up to date:

```bash
cd "G:/Веб-додатки/Юрбот/app_ЮрБот"
npx prisma generate --schema packages/db/prisma/schema.prisma
```

If this fails, check that `DATABASE_URL` is set in `.env` or use `--no-engine` for type-only generation.

### Step 2: TypeScript type checking

Run typecheck across the entire monorepo:

```bash
npm run typecheck
```

This checks all workspaces via composite project references in the root `tsconfig.json`.

**If typecheck fails:**

1. Read the error output carefully — errors are grouped by file
2. Fix errors in dependency order: shared → db → telegram → backend → web
3. Common issues:
   - Missing imports after schema changes → re-export from `packages/db/src/index.ts`
   - Zod schema mismatches after changing `packages/shared/src/schemas/` → update both schema and API route
   - Type narrowing issues in `apps/backend/src/services/` → check Prisma return types
   - React component prop changes → update all callers
4. After fixing, re-run `npm run typecheck` to verify

### Step 3: Tests

Run the test suite:

```bash
npm run test
```

Tests are in `tests/` directory at root level, using Vitest + Supertest.

**If tests fail:**

1. Read the failure message and trace to the source
2. If the test is outdated (tests old behavior that was intentionally changed), update the test
3. If the test reveals a real bug, fix the code
4. Re-run the specific failing test: `npx vitest run tests/<test-file>.test.ts`
5. Then run the full suite to check for regressions

### Step 4: Build

Run full production build:

```bash
npm run build
```

This executes in order: `prisma generate → shared → db → telegram → backend (tsc) → web (vite build)`

**If build fails:**

1. Check which workspace failed (the output shows which step)
2. Most common issues:
   - Import path errors (ESM requires `.js` extension in imports for Node packages)
   - Missing `dist/` directories → build dependencies first
   - Vite build errors → check `apps/web/vite.config.ts` and component imports
3. Fix and re-run only the failed workspace: `npm run build -w <workspace-name>`
4. Then re-run full build to verify

### Step 5: Report

After all steps complete (or after fixing all errors), output:

```
## Validation Report

### TypeCheck
- Status: ✅ Pass / ❌ [N] errors
- Fixed: [list of fixes if any]

### Tests
- Status: ✅ [N] passed / ❌ [N] failed
- Fixed: [list of fixes if any]

### Build
- Status: ✅ All workspaces built / ❌ Failed at [workspace]
- Fixed: [list of fixes if any]

### Ready to commit: ✅ Yes / ❌ No — [blockers]
```

## Quick mode

If the user only wants a quick check (e.g., after a small change):

```bash
# Just typecheck, skip build
npm run typecheck

# Just test one file
npx vitest run tests/auth.service.test.ts
```

## Error patterns specific to this monorepo

| Error pattern | Likely cause | Fix |
|---------------|-------------|-----|
| `Cannot find module '@jurbot/shared'` | Shared not built | `npm run build -w packages/shared` |
| `Cannot find module '@jurbot/db'` | DB not built or Prisma not generated | `npx prisma generate` then `npm run build -w packages/db` |
| `PrismaClientKnownRequestError` in tests | DB schema changed, migration needed | Run prisma migration |
| `Type 'X' is not assignable to type 'Y'` in routes | Zod schema and TypeScript type out of sync | Update Zod schema in packages/shared |
| `ERR_MODULE_NOT_FOUND` | ESM import missing `.js` extension | Add `.js` to relative imports in Node packages |
