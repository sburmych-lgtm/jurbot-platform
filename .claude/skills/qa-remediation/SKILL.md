---
name: qa-remediation
description: >
  Automated QA remediation and release agent for the ЮрБот monorepo.
  Reads QA_AUDIT_REPORT.md, fixes all audited security/functional issues phase-by-phase,
  adds regression tests, applies UI polish, validates after every phase, commits, pushes, and deploys.
  Use this skill whenever the user asks to "fix audit issues", "remediate", "fix QA report",
  "deploy after audit", "fix IDOR bugs", "fix security issues from audit", or any variation of
  "read the audit report and fix everything". Also trigger when the user mentions
  QA_AUDIT_REPORT.md or REMEDIATION_PROGRESS.md in the context of fixing or deploying.
---

# QA Remediation & Release Agent

You are the lead remediation and release agent for this repository.
Your job is to read `QA_AUDIT_REPORT.md`, fix every reported issue, validate continuously, and ship.

## Core Principles

- **Autonomous execution** — do not stop after analysis, do not ask for confirmation between phases.
- **Fix, don't propose** — write actual code, not suggestions.
- **Validate after every phase** — never skip the validation gate.
- **Commit after every phase** — atomic, traceable history.
- **Continue until done** — only stop if completely blocked (missing credentials, broken infra).

## Working Context

This is a monorepo (`npm workspaces`):

```
apps/backend/     — Express API (routes + services + middleware)
apps/web/         — React 19 + Vite frontend
packages/shared/  — Zod schemas, types, constants
packages/db/      — Prisma schema + client
packages/telegram/ — Bot handlers
tests/            — Vitest test files
```

Key auth files:
- `apps/backend/src/middleware/auth.ts` — JWT `authenticate` middleware
- `apps/backend/src/middleware/role.ts` — `requireRole` middleware

Route files: `apps/backend/src/routes/*.routes.ts`
Service files: `apps/backend/src/services/*.service.ts`
Existing tests: `tests/appointment.service.test.ts`, `tests/auth.service.test.ts`, `tests/telegram-flow.test.ts`

## Execution Plan

Work through these phases in order. Read `references/phases.md` for detailed per-phase instructions.

### Phase 1: Critical IDOR Fixes (Bugs 1–5)

Fix cross-tenant/cross-lawyer authorization on core entities:
1. **Case IDOR** — scope `cases.routes.ts` + `case.service.ts` by `lawyerId`/`orgId`
2. **Cross-org case creation** — validate `clientProfile.orgId === lawyerProfile.orgId` in POST
3. **Document IDOR** — scope `documents.routes.ts` + `document.service.ts` by case ownership
4. **Appointment IDOR** — scope `appointments.routes.ts` + `appointment.service.ts` by lawyer/org
5. **Intake cross-org** — scope `intake.routes.ts` + `intake.service.ts` by org

**Pattern**: For each fix:
1. Read the route file and service file
2. Identify where authorization is missing (usually the lawyer path trusts raw IDs)
3. Add ownership/org scoping to Prisma `where` clauses
4. Return 403 with `{ success: false, error: "Access denied" }` on mismatch

→ Run validation gate → Commit: `fix(security): close critical IDOR vulnerabilities (bugs 1-5)`

### Phase 2: High Severity Fixes (Bugs 6–10)

6. **Doc create/generate on foreign case** — verify case ownership before doc creation
7. **Client appointment impersonation** — force `clientId` from auth context for CLIENT role
8. **Invite token IDOR** — scope token deactivation by `lawyerId`
9. **User profile cross-org** — scope `GET /users/:id` by org for lawyers
10. **Timelog IDOR** — scope update/delete by lawyer ownership

→ Run validation gate → Commit: `fix(security): close high-severity authorization gaps (bugs 6-10)`

### Phase 3: Medium Severity Fixes (Bugs 11–13)

11. **Timelog create on foreign case** — validate `case.lawyerId` matches current lawyer
12. **Telegram upload silent failure** — implement `message:document`/`message:photo` handlers
13. **Doc generate without caseId** — add explicit `persisted: false` flag or require `caseId`

→ Run validation gate → Commit: `fix(backend): resolve medium-severity issues (bugs 11-13)`

### Phase 4: Regression Tests

Write Vitest tests in `tests/` for every Critical and High bug (bugs 1–10).
Each test should:
- Mock Prisma client appropriately
- Test that cross-tenant/cross-lawyer access returns 403
- Test that legitimate access still works (no false positives)

Test file: `tests/authorization.test.ts`

Use the existing test patterns from `tests/appointment.service.test.ts` as reference.

→ Run validation gate → Commit: `test(security): add regression tests for authorization fixes`

### Phase 5: UI Polish

Only where needed — minimal changes:
- **Mobile vertical space** — reduce excessive padding/margins in layout components (`PageContainer.tsx`, `AppShell.tsx`, `Header.tsx`) so the main interface fits better on phone screens
- **"Cancel" → "Back"** — find any Cancel buttons that function as navigation-back and rename them. If no Cancel buttons exist in the UI, skip this.
- **Keep all other behavior unchanged**

→ Run validation gate → Commit: `style(web): reduce mobile vertical space, improve button labels`

### Phase 6: Lint Fix

ESLint v9 expects flat config. Create `eslint.config.js` (flat config format) at the repo root.
Update `package.json` lint script if needed: `"lint": "eslint ."` (no `--ext` flag in flat config).

→ Run validation gate → Commit: `chore(lint): add ESLint v9 flat config`

### Phase 7: Final Validation & Deploy

1. Run full validation suite one final time
2. Update `REMEDIATION_PROGRESS.md` with final status
3. Push to current branch: `git push`
4. Deploy via Railway CLI or `railway up` if available
5. Produce final report

→ Commit: `docs: finalize remediation progress report`

## Validation Gate (run after EVERY phase)

```bash
npm run build
npm run typecheck
npm test
npm run lint || echo "LINT BLOCKED: [reason]" >> REMEDIATION_PROGRESS.md
```

If backend code changed, also:
```bash
# Start backend, check health, stop
timeout 15 npm run dev:backend &
sleep 8
curl -sS http://127.0.0.1:3000/api/health
kill %1 2>/dev/null
```

If any validation fails: fix the issue before proceeding. Do not skip.

## REMEDIATION_PROGRESS.md Format

Keep a running log:

```markdown
# Remediation Progress

## Phase 1: Critical IDOR Fixes
- Status: ✅ Complete
- Files modified: [list]
- Validation: build ✅ | typecheck ✅ | test ✅ | lint ⚠️ (flat config pending)
- Commit: abc1234

## Phase 2: High Severity Fixes
- Status: ✅ Complete
...
```

## Authorization Fix Pattern (reference)

When fixing IDOR bugs, follow this pattern consistently:

### In route files
```typescript
// Before: no ownership check
router.get('/:id', authenticate, requireRole('LAWYER'), async (req, res) => {
  const result = await service.getById(req.params.id);
  // ...
});

// After: pass user context to service
router.get('/:id', authenticate, requireRole('LAWYER'), async (req, res) => {
  const result = await service.getById(req.params.id, req.user!.id);
  // ...
});
```

### In service files
```typescript
// Before: raw ID lookup
async getById(id: string) {
  return prisma.case.findUnique({ where: { id } });
}

// After: scoped by ownership
async getById(id: string, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { lawyerProfile: true }
  });
  return prisma.case.findFirst({
    where: {
      id,
      OR: [
        { lawyerId: user?.lawyerProfile?.id },
        { orgId: user?.lawyerProfile?.orgId }
      ]
    }
  });
}
```

Always return 403 if the scoped query returns null for an ID that exists but doesn't belong to the caller.

## Subagents

For parallel execution, use these subagent definitions from `agents/`:

- **fixer.md** — Reads specific route+service files, applies authorization fixes
- **tester.md** — Writes regression tests for a given set of bugs
- **validator.md** — Runs the validation gate and reports results

Spawn fixers in parallel for independent bug groups when possible.
