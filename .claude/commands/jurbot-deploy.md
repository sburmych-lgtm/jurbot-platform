---
name: jurbot-deploy
description: Full deployment pipeline for JurBot — validate, commit, push to GitHub, deploy on Railway, and verify production. Use this skill when the user asks to "deploy", "push to production", "sync with GitHub", "deploy to Railway", "ship it", "go live", or after finishing a set of changes that need to be deployed. Also triggers on "commit and push", "синхронізувати", "задеплоїти", or "Railway deploy".
---

# JurBot Deploy Pipeline

Full pipeline: validate → commit → push → Railway deploy → verify production.

## Pre-flight checks

### Step 1: Validate the build

Run the full validation pipeline before anything else:

```bash
cd "G:/Веб-додатки/Юрбот/app_ЮрБот"

# 1. Prisma client up to date
npx prisma generate --schema packages/db/prisma/schema.prisma

# 2. TypeScript compiles
npm run typecheck

# 3. Tests pass
npm run test

# 4. Production build succeeds
npm run build
```

If ANY step fails — stop and fix before proceeding. Do not deploy broken code.

### Step 2: Security check

```bash
# Verify .env is gitignored
grep -q '.env' .gitignore && echo "✅ .env in .gitignore" || echo "❌ .env NOT in .gitignore"

# Check no secrets are staged
git diff --cached --name-only | grep -E '\.(env|pem|key)$' && echo "❌ SECRETS STAGED!" || echo "✅ No secrets staged"

# Check no hardcoded secrets in code
grep -rn "TELEGRAM_.*TOKEN.*=" apps/ packages/ --include="*.ts" | grep -v "process.env" | grep -v ".example" | grep -v "node_modules" | head -5
```

## Commit phase

### Step 3: Review changes

```bash
# What's changed
git status -sb

# Detailed diff
git diff --stat

# Untracked files
git status --short
```

### Step 4: Stage and commit

Stage changes logically — group by feature/fix:

```bash
# Example: stage by feature
git add packages/telegram/src/config.ts packages/telegram/src/lawyer/ packages/telegram/src/client/
git commit -m "fix(telegram): simplify registration messages and add military law specialty"

git add apps/backend/src/services/appointment.service.ts apps/backend/src/routes/appointments.routes.ts
git commit -m "fix(booking): enable multi-slot availability and slot conflict detection"

# etc.
```

**Commit message format:** conventional commits — `type(scope): description`

Types: `feat`, `fix`, `refactor`, `style`, `docs`, `test`, `chore`

Scopes: `telegram`, `booking`, `auth`, `docs`, `ui`, `db`, `deploy`

### Step 5: Push to GitHub

```bash
# Check current branch and tracking
git branch -vv

# Push (main branch deploys automatically on Railway)
git push origin main
```

**Warning:** Pushing to `main` triggers Railway auto-deploy. Ensure Step 1-2 passed.

If the branch is behind remote:
```bash
# Fetch and check
git fetch origin
git log --oneline HEAD..origin/main  # Shows remote-only commits

# If there are remote changes, pull first
git pull origin main --rebase
```

## Deploy phase

### Step 6: Monitor Railway deployment

Railway auto-deploys when code is pushed to `main`.

**Railway project URL:** Check the project's README or Railway dashboard.

Use Playwright to check Railway dashboard:
1. Navigate to Railway project page
2. Check deployment status (building → deploying → live)
3. Check build logs for errors
4. Verify the deployment health check passes

**Railway config (`railway.toml`):**
```toml
[deploy]
startCommand = "node apps/backend/dist/index.js"
healthcheckPath = "/api/health"
healthcheckTimeout = 30
preDeployCommand = "npx prisma db push --schema packages/db/prisma/schema.prisma --accept-data-loss"
```

### Step 7: Verify production

After Railway shows deployment as live:

1. **Health check:**
   ```bash
   curl -s https://<railway-domain>/api/health
   ```

2. **API smoke test:**
   ```bash
   curl -s https://<railway-domain>/api/health | head -20
   ```

3. **Frontend loads:** Use Playwright to navigate to the Mini App URL and verify it renders

4. **Telegram bots respond:** If possible, send a test message to both bots and verify they respond

## Post-deploy report

```markdown
## Deploy Report

### Pre-flight
- TypeCheck: ✅/❌
- Tests: ✅/❌ ([N] passed, [N] failed)
- Build: ✅/❌

### Commits pushed
1. `abc1234` — type(scope): description
2. `def5678` — type(scope): description

### Railway deployment
- Status: ✅ Live / ❌ Failed
- Health check: ✅/❌
- Build time: [N]s
- Pre-deploy (Prisma): ✅/❌

### Production verification
- API health: ✅/❌
- Frontend loads: ✅/❌
- Telegram bots: ✅/❌

### What was deployed
1. [Feature/fix 1]
2. [Feature/fix 2]
```

## Rollback

If production is broken after deploy:

1. Check Railway build logs for the error
2. If it's a quick fix — fix, commit, push again
3. If it needs investigation — rollback on Railway dashboard to previous deployment
4. Never force-push to main — use a revert commit instead:
   ```bash
   git revert HEAD
   git push origin main
   ```
