# Detailed Phase Instructions

## Table of Contents
1. [Phase 1: Critical IDOR Fixes](#phase-1)
2. [Phase 2: High Severity Fixes](#phase-2)
3. [Phase 3: Medium Severity Fixes](#phase-3)
4. [Phase 4: Regression Tests](#phase-4)
5. [Phase 5: UI Polish](#phase-5)
6. [Phase 6: Lint Fix](#phase-6)
7. [Phase 7: Final Validation & Deploy](#phase-7)

---

<a id="phase-1"></a>
## Phase 1: Critical IDOR Fixes (Bugs 1–5)

These are all authorization bypass vulnerabilities where lawyers can access other lawyers' or other organizations' data.

### Bug 1: Cross-lawyer case IDOR

**Files**: `apps/backend/src/routes/cases.routes.ts`, `apps/backend/src/services/case.service.ts`

**Problem**: Lawyer path has no ownership/org check before service call. Any authenticated lawyer can GET/PATCH/DELETE any case by ID.

**Fix steps**:
1. In `case.service.ts`, modify `getById`, `update`, and `remove` to accept `userId` parameter
2. Resolve the caller's `lawyerProfile` (with `orgId`)
3. Add `lawyerId` or `orgId` to Prisma `where` clause
4. In `cases.routes.ts`, pass `req.user!.id` to service calls
5. Return 403 if scoped query returns null but unscoped would find it

### Bug 2: Cross-org case creation

**Files**: `apps/backend/src/routes/cases.routes.ts`, `apps/backend/src/services/case.service.ts`

**Problem**: POST only checks that `clientProfile` exists, not that it belongs to the same org.

**Fix steps**:
1. In the create flow, after resolving `clientProfile`, compare `clientProfile.orgId` with the lawyer's `orgId`
2. If mismatch, return 403 with clear error message
3. This prevents lawyers from creating cases linked to clients in other organizations

### Bug 3: Cross-lawyer document IDOR

**Files**: `apps/backend/src/routes/documents.routes.ts`, `apps/backend/src/services/document.service.ts`

**Problem**: Route checks access only for client role; lawyer path is unrestricted. Service updates/deletes by raw ID.

**Fix steps**:
1. In `document.service.ts`, modify read/update/delete to join through `case` and check `case.lawyerId` or `case.orgId`
2. In routes, pass user context to service
3. Return 403 on mismatch

### Bug 4: Cross-lawyer appointment IDOR

**Files**: `apps/backend/src/routes/appointments.routes.ts`, `apps/backend/src/services/appointment.service.ts`

**Problem**: Only client path verifies ownership; lawyer path is unrestricted.

**Fix steps**:
1. In `appointment.service.ts`, scope GET/PATCH/DELETE by `lawyerId` or org
2. In routes, pass user context
3. Return 403 on mismatch

### Bug 5: Intake cross-org leakage

**Files**: `apps/backend/src/routes/intake.routes.ts`, `apps/backend/src/services/intake.service.ts`

**Problem**: Route passes no user/org context; service queries global intake. List/get/convert are all unscoped.

**Fix steps**:
1. Resolve lawyer's `orgId` from auth context
2. Filter intake list by `orgId`
3. Scope get and convert by `orgId`
4. Return 403/404 for cross-org access attempts

---

<a id="phase-2"></a>
## Phase 2: High Severity Fixes (Bugs 6–10)

### Bug 6: Doc create/generate on foreign cases

**Files**: `apps/backend/src/routes/documents.routes.ts`, `apps/backend/src/services/document.service.ts`

**Fix**: Before creating/generating a document, verify the referenced `caseId` belongs to the current lawyer's org/ownership scope.

### Bug 7: Client appointment impersonation

**Files**: `apps/backend/src/routes/appointments.routes.ts`, `apps/backend/src/services/appointment.service.ts`

**Problem**: `if (!clientId && userRole === 'CLIENT') ...` leaves a provided `clientId` untouched.

**Fix**: For CLIENT role, ALWAYS override `clientId` from the authenticated user's client profile, ignoring any client-supplied value.

```typescript
// Force clientId for CLIENT role
if (req.user!.role === 'CLIENT') {
  body.clientId = req.user!.clientProfile!.id;
}
```

### Bug 8: Invite token deactivation IDOR

**Files**: `apps/backend/src/routes/tokens.routes.ts`, `apps/backend/src/services/token.service.ts`

**Fix**: Add `lawyerId` (or org scope) to the deactivation query: `where: { id, lawyerId: currentLawyerProfileId }`.

### Bug 9: User profile cross-org exposure

**Files**: `apps/backend/src/routes/users.routes.ts`, `apps/backend/src/services/user.service.ts`

**Fix**: For LAWYER role, restrict `getById` to users within the same `orgId`. Check via org membership or profile org relation.

### Bug 10: Timelog IDOR on update/delete

**Files**: `apps/backend/src/routes/timelogs.routes.ts`, `apps/backend/src/services/timelog.service.ts`

**Fix**: Add `lawyerId` ownership check to update/delete Prisma queries.

---

<a id="phase-3"></a>
## Phase 3: Medium Severity Fixes (Bugs 11–13)

### Bug 11: Timelog create on foreign case

**Files**: `apps/backend/src/services/timelog.service.ts`

**Fix**: Before creating a timelog, validate `case.lawyerId === currentLawyerProfile.id`.

### Bug 12: Telegram upload silent failure

**Files**: `packages/telegram/src/client-bot.ts` (or similar client bot handler file)

**Problem**: Callback promises upload flow, but only `message:text` handlers exist.

**Fix**:
1. Add `message:document` and `message:photo` handlers
2. Save uploaded file metadata (at minimum store reference in DB)
3. Send confirmation to user after successful upload
4. Handle errors gracefully with user-facing message

Note: Full file persistence requires storage config. If S3/storage is not configured, implement the handler to at least acknowledge the file and store metadata, with a TODO for full storage integration.

### Bug 13: Non-persistent document generation

**Files**: `apps/backend/src/services/document.service.ts`

**Problem**: When `caseId` is omitted, returns a fabricated success-like object.

**Fix options** (pick the simpler one):
- Add explicit `persisted: false` flag to the response
- OR require `caseId` and return 400 if missing

---

<a id="phase-4"></a>
## Phase 4: Regression Tests

Create `tests/authorization.test.ts` with tests for bugs 1–10.

**Test structure** (using existing Vitest + Prisma mock patterns):

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Authorization: Case IDOR (Bug 1)', () => {
  it('should return 403 when lawyer A accesses lawyer B case', async () => {
    // Setup: mock lawyerA context, caseId belonging to lawyerB
    // Action: call service.getById(caseId, lawyerA.userId)
    // Assert: result is null or error thrown
  });

  it('should allow lawyer to access own case', async () => {
    // Setup: mock lawyerA context, caseId belonging to lawyerA
    // Action: call service.getById(caseId, lawyerA.userId)
    // Assert: result returned
  });
});
```

Reference existing test files for mock setup patterns:
- `tests/appointment.service.test.ts`
- `tests/auth.service.test.ts`

Each bug needs at minimum:
- One "access denied" test (cross-tenant/cross-lawyer → 403 or null)
- One "access allowed" test (legitimate owner → success)

---

<a id="phase-5"></a>
## Phase 5: UI Polish

### Mobile vertical space

Check these files for excessive padding/margin:
- `apps/web/src/components/layout/PageContainer.tsx`
- `apps/web/src/components/layout/Header.tsx`
- `apps/web/src/components/layout/AppShell.tsx`
- `apps/web/src/components/layout/BottomNav.tsx`

Common fixes:
- Reduce `p-6` to `p-4` or `p-3` on mobile
- Reduce header height on mobile
- Use `@media (max-width: 640px)` or Tailwind `sm:` breakpoints
- Reduce `gap-*` values in card grids on mobile

### Cancel → Back

Search all `.tsx` files for text "Cancel" or "Скасувати" used as a navigation-back action.
If found, replace with "Back" / "Назад" where the button navigates back (not where it cancels a destructive operation like a form submission).

If no such buttons exist, skip this step entirely.

---

<a id="phase-6"></a>
## Phase 6: Lint Fix

ESLint v9 uses flat config. Create `eslint.config.js` at repo root:

```javascript
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/*.js', '!eslint.config.js'],
  },
];
```

Update `package.json`:
```json
"lint": "eslint ."
```

Install any missing deps: `@eslint/js`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`.

---

<a id="phase-7"></a>
## Phase 7: Final Validation & Deploy

1. **Full validation**: `npm run build && npm run typecheck && npm test && npm run lint`
2. **Backend smoke**: start dev server, hit `/api/health`, verify 200
3. **Update REMEDIATION_PROGRESS.md**: mark all phases complete, list all commits
4. **Push**: `git push origin HEAD`
5. **Deploy Railway**: use `railway up` or trigger deploy via Railway dashboard/CLI
6. **Final report**: summary of all changes, test results, deploy status
