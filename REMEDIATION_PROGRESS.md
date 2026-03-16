# Remediation Progress

## Phase 1-3: Security Fixes (Bugs 1-13)
- Status: ✅ Complete
- Files modified:
  - `apps/backend/src/services/case.service.ts` — lawyer scoping on list/getById/update/softDelete + org validation on create
  - `apps/backend/src/routes/cases.routes.ts` — pass userId/role to all service calls, scope checklist/messages
  - `apps/backend/src/services/document.service.ts` — lawyer scoping on list/getById/update/softDelete + case ownership on create/generate + persisted:false flag
  - `apps/backend/src/routes/documents.routes.ts` — pass userId to all service calls
  - `apps/backend/src/services/appointment.service.ts` — lawyer scoping on getById/update/remove + force clientId for CLIENT role
  - `apps/backend/src/routes/appointments.routes.ts` — pass userId/role to service calls
  - `apps/backend/src/services/intake.service.ts` — org scoping on list/getById + org validation on convertToCase
  - `apps/backend/src/routes/intake.routes.ts` — pass userId to service calls
  - `apps/backend/src/services/token.service.ts` — lawyerId ownership on deactivateToken
  - `apps/backend/src/routes/tokens.routes.ts` — resolve lawyerId before deactivation
  - `apps/backend/src/routes/users.routes.ts` — org scoping on GET /:id for lawyers
  - `apps/backend/src/services/timelog.service.ts` — lawyer ownership on update/remove + case ownership on create
  - `apps/backend/src/routes/timelogs.routes.ts` — pass userId to update/remove
- Validation: build ✅ | typecheck ✅ | test ✅ (10/10) | lint ⚠️ (flat config pending)

## Phase 4: Regression Tests (Bugs 1-10)
- Status: ✅ Complete
- Files created:
  - `tests/authorization.test.ts` — 19 tests covering IDOR deny/allow for cases, documents, appointments, intake, tokens, timelogs
- Validation: all 29 tests pass (10 existing + 19 new)

## Phase 5: UI Polish
- Status: ✅ Complete
- Files modified:
  - `apps/web/src/components/layout/Header.tsx` — reduced mobile padding, responsive title sizing
  - `apps/web/src/components/layout/AppShell.tsx` — reduced mobile padding/bottom spacing
- Changes: mobile-first spacing with sm: breakpoint overrides

## Phase 6: ESLint v9 Flat Config
- Status: ✅ Complete
- Files created/modified:
  - `eslint.config.js` — new flat config with typescript-eslint, allowEmptyCatch, no-namespace off
  - `package.json` — updated lint script, added typescript-eslint devDependency
- Validation: 0 errors, 29 warnings (all pre-existing no-explicit-any + no-unused-vars)

## Phase 7: Final Validation & Deploy
- Status: 🔄 In progress
- Final validation: build ✅ | typecheck ✅ | test ✅ (29/29) | lint ✅ (0 errors)
