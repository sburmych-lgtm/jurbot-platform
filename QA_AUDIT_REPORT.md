A. **Feature inventory**

- **Monorepo architecture**: `apps/backend` (Express API), `apps/web` (React/Vite UI), `packages/db` (Prisma schema/client), `packages/telegram` (lawyer/client bot logic), `packages/shared` (schemas/types/constants).
- **Core product features**: intake, appointments, case portal, document generation/management, Telegram integration, role-based auth (Lawyer/Client).
- **Tenant model**: explicit `Organization` + `OrganizationMember` and `orgId` on core entities (cases/documents/appointments/intake/notifications).
- **Auth boundaries**:
  - JWT Bearer middleware (`authenticate`) and role middleware (`requireRole`).
  - Telegram init-data auth + dual-mode `flexAuth`.

---

B. **Risk-based test matrix**

| Area | Risk | Priority | Result |
|---|---|---:|---|
| Case access/update/delete | Cross-lawyer IDOR | P0 | **Fail (critical)** |
| Document access/update/delete/create | Cross-tenant IDOR/data tamper | P0 | **Fail (critical/high)** |
| Appointment read/update/delete/create | Cross-lawyer IDOR + client impersonation | P0 | **Fail (critical/high)** |
| Intake listing/get/convert | Cross-org data leak & takeover | P0 | **Fail (critical)** |
| Invite token ownership | Cross-lawyer token revocation | P1 | **Fail (high)** |
| User profile read | Cross-org user data exposure | P1 | **Fail (high)** |
| Timelogs | Cross-lawyer mutation | P1 | **Fail (high/medium)** |
| Telegram callbacks | Silent/broken user flow | P2 | **Fail (medium)** |
| Build/type/tests | Regression baseline | P1 | Build/type/tests pass; lint fails config |

(Also documented in committed audit report.)

---

C. **Commands executed**

- `npm install`
- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run dev -w apps/backend`
- `curl -sS http://127.0.0.1:3000/api/health`

---

D. **Passed checks**

- ✅ `npm install`
- ✅ `npm run build`
- ✅ `npm run typecheck`
- ✅ `npm test`
- ✅ `npm run dev -w apps/backend` (startup smoke)
- ✅ `curl -sS http://127.0.0.1:3000/api/health`

(These outcomes are captured in the audit report.)

---

E. **Failed checks**

- ❌ `npm run lint` — ESLint v9 expects flat config (`eslint.config.*`) and cannot find one.

---

F. **Bug list by severity**

## Critical
1. Lawyers can read/update/delete other lawyers’ cases by ID.
2. Lawyers can create cases linked to foreign-org clients.
3. Lawyers can read/update/delete other lawyers’ documents.
4. Lawyers can read/update/delete other lawyers’ appointments.
5. Intake list/get/convert are not org-scoped.

## High
6. Lawyers can create/generate docs for foreign cases.
7. Client can book appointment with arbitrary `clientId` (impersonation risk).
8. Lawyer can deactivate another lawyer’s invite token.
9. Lawyer can fetch arbitrary user profile (`/users/:id`) across orgs.
10. Timelog update/delete lacks ownership checks.

## Medium
11. Timelog create allows logging against another lawyer’s case.
12. Telegram “upload file” callback says it works but no file handler exists.
13. Document generation can return non-persisted “success-like” object when `caseId` omitted.

(Consolidated list in report.)

---

G. **Detailed bug entries**

### 1) Cross-lawyer case IDOR (read/update/delete)
- **Severity**: Critical  
- **Affected**: cases routes + service  
- **Repro**:
  1. Login as Lawyer A.
  2. Call `GET/PATCH/DELETE /api/v1/cases/{caseId_of_lawyer_B}`.
- **Expected**: 403 unless case belongs to A’s org/ownership scope.
- **Actual**: lawyer path has no ownership/org check before service call.
- **Evidence**: client-only check in route; service methods operate by raw id only.
- **Root cause**: missing lawyer-side authorization guard.
- **Likely files/functions**: `cases.routes.ts`, `case.service.ts`.
- **Fix**: enforce `lawyerId`/`orgId` scope on get/update/delete queries.
- **Regression test**: integration test where Lawyer A accesses Lawyer B case -> 403.

### 2) Cross-org case creation
- **Severity**: Critical  
- **Affected**: `POST /api/v1/cases`
- **Repro**: Lawyer A submits `clientId` from org B.
- **Expected**: reject with 403/400.
- **Actual**: only existence check on client profile.
- **Evidence**: `create` validates `clientProfile` exists; no org match check.
- **Fix**: require `clientProfile.orgId === lawyerProfile.orgId`.
- **Regression test**: cross-org `clientId` payload should fail.

### 3) Cross-lawyer document IDOR
- **Severity**: Critical  
- **Affected**: `/documents/:id`, `PATCH`, `DELETE`
- **Repro**: Lawyer A uses doc id from Lawyer B.
- **Expected**: 403.
- **Actual**: no lawyer ownership check.
- **Evidence**: route checks access only for client role; service updates by id directly.
- **Fix**: scope by case.lawyer/org in read/write paths.
- **Regression test**: A cannot mutate/read B doc.

### 4) Document create/generate on foreign cases
- **Severity**: High  
- **Affected**: `POST /documents`, `POST /documents/generate`
- **Repro**: Lawyer A references B’s `caseId`.
- **Expected**: 403.
- **Actual**: existence-only validation.
- **Evidence**: only `findUnique(caseId)` checks in create/generate.
- **Fix**: verify case ownership/org before generation/create.
- **Regression test**: cross-org case ID rejected.

### 5) Cross-lawyer appointment IDOR
- **Severity**: Critical  
- **Affected**: `GET/PATCH/DELETE /appointments/:id`
- **Repro**: Lawyer A uses appointment id from B.
- **Expected**: 403.
- **Actual**: only client path verifies ownership; lawyer path unrestricted.
- **Evidence**: route/client-only check and service raw-id mutations.
- **Fix**: scope by current lawyer/org for all lawyer appointment actions.
- **Regression test**: cross-lawyer appointment read/update/cancel blocked.

### 6) Client appointment impersonation via `clientId`
- **Severity**: High  
- **Affected**: `POST /appointments`
- **Repro**: authenticated CLIENT sends body with another `clientId`.
- **Expected**: server should ignore client-supplied `clientId` and force own profile id.
- **Actual**: client-provided `clientId` accepted if present.
- **Evidence**: `if (!clientId && userRole === 'CLIENT') ...` leaves provided `clientId` untouched.
- **Fix**: for CLIENT role always override `clientId` from auth context.
- **Regression test**: client cannot create booking for another client profile.

### 7) Intake cross-org leakage and conversion
- **Severity**: Critical  
- **Affected**: intake list/get/convert
- **Repro**: Lawyer A calls list/get and converts intake from another org.
- **Expected**: only own org submissions visible/convertible.
- **Actual**: no org filter in list/get; convert lacks org validation.
- **Evidence**: route passes no user/org context; service queries global intake by id/list and converts directly.
- **Fix**: resolve lawyer org and scope every intake query/mutation.
- **Regression test**: cross-org intake access returns 403/404.

### 8) Invite token deactivation IDOR
- **Severity**: High  
- **Affected**: `DELETE /tokens/:id`
- **Repro**: Lawyer A deactivates token id owned by Lawyer B.
- **Expected**: 403.
- **Actual**: deactivation by raw token id.
- **Evidence**: route forwards id only; service sets `isActive=false` with no owner check.
- **Fix**: enforce `where: { id, lawyerId: currentLawyerId }` (or org scoped).
- **Regression test**: foreign token id cannot be deactivated.

### 9) User profile cross-org exposure for lawyers
- **Severity**: High  
- **Affected**: `GET /users/:id`
- **Repro**: Lawyer A fetches arbitrary user id.
- **Expected**: only own org users (or explicit policy).
- **Actual**: only clients are restricted from чужий id; lawyer unrestricted.
- **Evidence**: route restriction applies only to client role; service returns profile data for any id.
- **Fix**: add org-based scoping for lawyer `getById`.
- **Regression test**: lawyer cannot fetch non-org user.

### 10) Timelog IDOR on update/delete
- **Severity**: High  
- **Affected**: `PATCH/DELETE /timelogs/:id`
- **Repro**: Lawyer A mutates Lawyer B timelog id.
- **Expected**: 403.
- **Actual**: existence check only.
- **Evidence**: service `update/remove` query by id without owner check.
- **Fix**: join on lawyer profile for current user.
- **Regression test**: cross-lawyer timelog mutation blocked.

### 11) Timelog create on foreign case
- **Severity**: Medium  
- **Affected**: `POST /timelogs`
- **Repro**: Lawyer A logs time for case belonging to B.
- **Expected**: reject.
- **Actual**: checks only case existence.
- **Evidence**: no case ownership validation before create.
- **Fix**: validate `case.lawyerId === currentLawyerProfile.id`.
- **Regression test**: foreign caseId fails.

### 12) Telegram upload silent failure
- **Severity**: Medium  
- **Affected**: client bot callback `c:upload`
- **Repro**:
  1. Click “📎 Завантажити файл”.
  2. Bot says “send file”.
  3. Send file/document.
- **Expected**: file handled/persisted/acknowledged.
- **Actual**: only text message handlers exist; no document/file handler.
- **Evidence**: callback promises upload flow; bot only defines `message:text` handlers.
- **Fix**: implement `message:document`/`photo` handlers with persistence + confirmations.
- **Regression test**: bot e2e test uploads file and verifies DB linkage.

### 13) Non-persistent document generation success
- **Severity**: Medium  
- **Affected**: `POST /documents/generate`
- **Repro**: call generate without `caseId`.
- **Expected**: clear “preview-only/not saved” response semantics or force persistence.
- **Actual**: returns synthetic doc payload with random id/status like persisted entity.
- **Evidence**: explicit branch returns fabricated object when no caseId.
- **Fix**: explicit `persisted: false` flag or require `caseId`.
- **Regression test**: API contract test distinguishes preview vs persisted artifact.

---

H. **Untestable areas and blockers**

- Full cross-tenant HTTP exploitation wasn’t executed end-to-end because deterministic tenant fixtures were not pre-provisioned in this environment; findings are code-confirmed and high confidence.  
- Telegram real delivery/webhook behavior requires valid bot tokens + Telegram infra; local smoke can only validate startup and route availability.  
- No existing integration/e2e authz suite to automatically prove these regressions in CI.  
(Also documented in the committed report.)

---

I. **Final assessment**

- **Ship decision**: **DO NOT SHIP**.

**Top 5 risks**
1. Case IDOR across lawyers/orgs.
2. Document IDOR + cross-case tampering.
3. Appointment IDOR + client impersonation via `clientId`.
4. Intake global visibility/conversion across tenants.
5. Invite-token ownership bypass.

**Recommended next fixes (priority order)**
1. Introduce centralized authorization helpers (`assertCaseAccess`, `assertDocumentAccess`, `assertAppointmentAccess`) and enforce on every read/write endpoint.
2. Enforce org/lawyer scoping in all service `getById/update/delete/create` calls (Prisma `where` + relation filters).
3. Force CLIENT appointment creation to authenticated profile id (ignore payload `clientId`).
4. Add tenant-aware integration tests for every route family (cases/documents/appointments/intake/tokens/users/timelogs).
5. Fix Telegram `c:upload` flow with real file handlers and persistence acknowledgments.

---

