---
name: jurbot-master-task
description: Master orchestrator for the JurBot project — runs a full cycle of diagnostics, bug fixes, feature implementation, and deployment. Use this skill when the user gives a large multi-part task covering git sync, Telegram bot UX, booking/appointment fixes, document generation, UI simplification, and Railway deployment. Triggers on "full jurbot task", "master task", "run everything", "continue Codex work", "finish the task", or when the user pastes a comprehensive task list for JurBot. Launches sub-agents in parallel for maximum efficiency.
---

# JurBot Master Task Orchestrator

Coordinate a full diagnostic and improvement cycle for the JurBot legal tech platform. This is a monorepo with two Telegram bots, a Mini App frontend, Express backend, PostgreSQL database, and Railway deployment.

## Project context

- **Location:** G:\Веб-додатки\Юрбот\app_ЮрБот
- **GitHub:** https://github.com/sburmych-lgtm/jurbot-platform
- **Railway:** https://railway.com/project/46d845aa-79a9-4eb6-b4ab-9ba12850e8a4
- **Stack:** React 19 + Express 5 + PostgreSQL + Prisma + Grammy (Telegram) + Gemini 2.5 Flash
- **Monorepo:** npm workspaces — apps/backend, apps/web, packages/db, packages/shared, packages/telegram
- **Deploy:** GitHub main → Railway auto-deploy
- **Reference UI:** C:/Users/User/Downloads/YurBot_Demo_Interface.html

## Execution phases

Parse the user's task and organize into these phases. Skip phases the user didn't request.

### Phase 0: Initial assessment (parallel sub-agents)

Launch these simultaneously — they're independent:

**Agent 1: Git Sync Check**
```
Compare local code at G:\Веб-додатки\Юрбот\app_ЮрБот with GitHub remote.
git fetch origin, compare commits, check uncommitted changes.
Report sync status. Do NOT push or pull.
```

**Agent 2: Build Validation**
```
In G:\Веб-додатки\Юрбот\app_ЮрБот run:
1. npx prisma generate --schema packages/db/prisma/schema.prisma
2. npm run typecheck
3. npm run test
4. npm run build
Report all errors. Do NOT fix — just report.
```

**Agent 3: Code Review (what Codex changed)**
```
Read these files and analyze the changes described in the task:
- apps/backend/src/middleware/auth.ts (JWT + Telegram auth)
- apps/backend/src/services/appointment.service.ts (booking logic)
- apps/backend/src/routes/appointments.routes.ts (availability API)
- packages/shared/src/schemas/appointment.schema.ts (lawyerId optional)
- packages/db/prisma/schema.prisma (LawyerAvailability model)
- apps/web/src/pages/client/BookingPage.tsx (slot selection)
- apps/web/src/pages/lawyer/SchedulePage.tsx (availability management)
- apps/web/src/components/calendar/TimeSlots.tsx (slot states)
- apps/web/src/pages/lawyer/DocumentsPage.tsx (AI generation)
- packages/telegram/src/config.ts (messages, specializations)
Report: what works, what's broken, what's incomplete.
```

### Phase 1: Fix build errors (sequential)

Based on Phase 0 results, fix all compilation and build errors in dependency order:

1. `packages/shared` — Fix Zod schemas, types, enums
2. `packages/db` — Fix Prisma schema, generate client, run migration
3. `packages/telegram` — Fix config.ts consistency, message handlers
4. `apps/backend` — Fix services, routes, middleware
5. `apps/web` — Fix pages, components

After each fix: `npm run typecheck` to verify progress.

### Phase 2: Telegram bot UX (use /telegram-ux-edit skill)

Fix both bots' registration and post-registration flows:

**Lawyer bot:**
- Add "військове право" (MILITARY) to specialization list
- Final message: "Ваш операційний кабінет адвоката 👇" + full-width "Відкрити Юрбот" button
- Remove stats block (справ/заявок/сьогодні/клієнтів) from final message

**Client bot:**
- After registration: "Ласкаво просимо до Юрбот!\nЗапис доступний через miniapp 👇"
- Remove all extra buttons ("Записатися на прийом", etc.)
- Full-width "Відкрити Юрбот" Mini App button

**Both bots:**
- Ensure callback handlers aren't broken by removed buttons
- Build telegram package: `npm run build -w packages/telegram`

### Phase 3: Fix booking/appointments

Ensure the full flow works:

1. **Lawyer sets availability** (SchedulePage) → saved via PUT /appointments/availability
2. **Client sees available slots** (BookingPage) → fetched via GET /appointments/availability
3. **Client books a slot** → POST /appointments (auto-detects lawyerId)
4. **Lawyer gets notification** → via Telegram bot
5. **Booked slot becomes unavailable** → reflected in both lawyer's schedule and client's view

Test the full chain. Fix any broken links.

### Phase 4: Fix document generation

1. Check Gemini API integration — `GOOGLE_GENERATIVE_AI_API_KEY` must be accessible from Railway env
2. Fix "token generation missing" error in DocumentsPage
3. Verify template upload, "Мої шаблони", and placeholder filling work
4. Test AI generation end-to-end

### Phase 5: Simplify Mini App UI (use /ui-reference-compare skill)

Compare current UI with reference file: `C:/Users/User/Downloads/YurBot_Demo_Interface.html`

Simplify:
- Lawyer dashboard
- Client dashboard
- Bottom navigation
- Remove excess scroll, make content fit on one screen
- Keep it clean, intuitive, not overloaded

### Phase 6: Tests

Write/update tests for:
- Booking without explicit lawyerId
- Availability API (GET/PUT)
- Busy slot blocking
- Telegram notification on new booking

Run: `npm run test`

### Phase 7: Deploy (use /jurbot-deploy skill)

1. Final validation: typecheck + test + build
2. Commit with conventional commits (logical groups)
3. Push to GitHub main
4. Monitor Railway deployment
5. Verify production (health check, frontend, bots)

### Phase 8: Final report

```markdown
## JurBot Task Report

### What was fixed
1. [Fix 1]
2. [Fix 2]

### Commits
1. `abc1234` — type(scope): description
2. ...

### Deployed to Railway
- Status: ✅/❌
- URL: [production URL]

### Tests
- Ran: [list]
- Results: [pass/fail counts]

### Remaining items (if any)
1. [Item] — reason: [why it wasn't done]
```

## Sub-agent routing

| Task | Agent type | Parallel? |
|------|-----------|-----------|
| Git sync check | Explore | ✅ Phase 0 |
| Build validation | verifier | ✅ Phase 0 |
| Code review | researcher | ✅ Phase 0 |
| Build fixes | implementer | ❌ Sequential |
| Telegram UX | implementer | ❌ After build fixes |
| Booking fixes | implementer | ❌ After build fixes |
| Document fixes | implementer | ❌ After booking |
| UI simplification | implementer | ❌ After core fixes |
| Test writing | test-writer | ❌ After all fixes |
| Deploy | verifier | ❌ Last |

## Guidelines

- **Fix before feature:** Resolve all build errors before adding new functionality
- **Commit often:** After each logical unit of work
- **Test after fix:** Run typecheck after every change
- **Don't break existing:** Ensure removed UI still has its functionality accessible somewhere
- **Prisma first:** If schema changed, generate + migrate BEFORE touching backend code
- **Security:** Never commit .env, check git diff --cached before commits
- **Playwright:** Use for Railway dashboard, production verification, and Google Cloud Console if needed
