# MASTER_DEFECT_LIST.md

## Purpose
This file is the master stabilization backlog for YurBot.
It is the control queue for Codex.

Rules:
- Fix sequentially by priority.
- After each fix, run full regression:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`
  - `npm test`
- Update this file after every iteration.
- Do not mark a defect `FIXED` unless the code path changed and verification ran successfully.

Status values:
- `OPEN`
- `IN_PROGRESS`
- `FIXED`
- `PARTIALLY_FIXED`
- `BLOCKED`
- `DEFERRED`
- `NON_REPRODUCIBLE`

Severity:
- `P0` = release blocker / broken core functionality
- `P1` = major functional defect / unsafe behavior
- `P2` = degraded UX / incomplete but not blocking
- `P3` = minor issue / polish

---

# PHASE 0 — LIVE PRODUCTION-LIKE BUGS TO FIX FIRST

## B-001 — Client booking shows "Invalid datetime"
- Severity: `P0`
- Status: `FIXED`
- Area: Booking / datetime serialization / validation
- Symptom:
  - In client booking flow, submitting a selected date/time produces `Invalid datetime`.
- Root cause:
  - Booking payload contract relied on runtime `Date` parsing in the client and schema validation that did not explicitly enforce timezone-offset handling, so valid user selections could serialize inconsistently across clients and fail datetime validation.
- Files changed:
  - `apps/web/src/pages/client/BookingPage.tsx`
  - `packages/shared/src/schemas/appointment.schema.ts`
  - `tests/appointment-datetime-contract.test.ts`
- Exact fix applied:
  - Replaced `Date` constructor-based serialization in client booking submit flow with validated deterministic RFC3339 UTC payload construction (`YYYY-MM-DDTHH:mm:00.000Z`).
  - Added strict date/time format guards before submit and preserved explicit user-facing validation toast for invalid input.
  - Updated appointment create/update zod schema to require datetime with timezone offset (`datetime({ offset: true })`) to keep transport contract explicit and consistent.
  - Extended datetime contract tests to verify offset-based ISO strings are accepted for both create and update payloads.
- Tests added/updated:
  - Updated `tests/appointment-datetime-contract.test.ts` to cover explicit timezone offsets for create/update payload validation.
- Verification evidence:
  - `npm run lint` ✅
  - `npm run typecheck` ✅
  - `npm run build` ✅
  - `npm test` ✅
- Regressions:
  - None detected in full verification suite.
- Residual limitations:
  - End-to-end behavior in real Telegram mobile webview still requires device validation.

## B-002 — Client document upload still returns internal server error
- Severity: `P0`
- Status: `FIXED`
- Area: Client documents / upload / backend persistence
- Symptom:
  - Client selects a file/image and receives `Internal server error`.
- Root cause:
  - Upload endpoint accepted weakly validated file payloads and non-client callers, so malformed/empty multipart payloads could reach persistence path and fail late; contract boundaries were not explicit enough for user-facing handling.
- Files changed:
  - `apps/backend/src/routes/documents.routes.ts`
  - `apps/backend/src/services/document.service.ts`
  - `tests/document-upload.service.test.ts`
- Exact fix applied:
  - Restricted `/v1/documents/upload` to `CLIENT` role to align endpoint contract with product behavior.
  - Added server-side file input validation (`name`, length, non-empty bytes) before DB persistence for both client and lawyer binary-upload flows.
  - Preserved explicit no-active-case business-rule message while preventing malformed expected uploads from degrading into generic server failures.
  - Added upload service tests for successful client upload path and empty-file validation failure.
- Tests added/updated:
  - Added `tests/document-upload.service.test.ts`.
- Verification evidence:
  - `npm run lint` ✅
  - `npm run typecheck` ✅
  - `npm run build` ✅
  - `npm test` ✅
- Regressions:
  - None detected in full verification suite.
- Residual limitations:
  - Real-device Telegram file-picker/upload UX must still be validated on mobile clients.

## B-003 — "Scan" action is misleading if it only opens camera capture
- Severity: `P2`
- Status: `FIXED`
- Area: Mobile upload UX
- Symptom:
  - The current label implies document-scanner capability, but implementation opens standard camera capture.
- Root cause:
  - Upload source CTA and camera option wording were ambiguous and could be interpreted as native scanner functionality instead of plain camera capture.
- Files changed:
  - `apps/web/src/pages/client/DocumentsPage.tsx`
- Exact fix applied:
  - Renamed source CTA and camera option text to explicitly describe file source selection and regular camera photo behavior.
  - Updated helper copy to explicitly state that camera flow is standard capture and not a native scanner.
- Tests added/updated:
  - No automated tests added (copy-only UI text update).
- Verification evidence:
  - `npm run lint` ✅
  - `npm run typecheck` ✅
  - `npm run build` ✅
  - `npm test` ✅
  - Manual UI review performed in web client upload section.
- Regressions:
  - None detected in full verification suite.
- Residual limitations:
  - Final confirmation of device camera behavior remains pending real Telegram mobile validation.

---

# PHASE 1 — TIME SLOT SANITY

## B-004 — Past time slots remain selectable on the current day
- Severity: `P0`
- Status: `OPEN`
- Area: Booking availability / slot generation
- Symptom:
  - At late time of day, users still see outdated morning/daytime slots for today.
- Acceptance criteria:
  - backend filters past slots for current day,
  - frontend applies defensive client-side filtering,
  - time filtering uses the actual app-local timezone consistently,
  - optional safe buffer is applied if product logic requires it.
- Verification:
  - tests around same-day slot filtering,
  - full regression suite,
  - manual same-day availability check.

---

# PHASE 2 — CALENDAR VISIBILITY

## B-005 — Lawyer cannot clearly see which dates contain bookings
- Severity: `P1`
- Status: `OPEN`
- Area: Lawyer calendar / schedule visibility
- Symptom:
  - Lawyer must guess dates and click around to find bookings.
- Acceptance criteria:
  - dates containing relevant bookings are visibly highlighted before click,
  - highlight logic covers the relevant appointment states,
  - calendar month changes refresh highlighted dates correctly.
- Verification:
  - tests where practical,
  - full regression suite,
  - manual lawyer calendar check.

---

# PHASE 3 — LAWYER DECISION FLOW FOR BOOKINGS

## B-006 — Lawyer cannot properly accept / reject / reschedule booking requests
- Severity: `P0`
- Status: `OPEN`
- Area: Booking lifecycle / lawyer actions
- Symptom:
  - No complete decision workflow for incoming booking requests.
- Required behavior:
  - lawyer can confirm booking,
  - lawyer can reject booking,
  - lawyer can suggest another time,
  - lawyer can mark slot unavailable,
  - lawyer can refuse the client.
- Data-model rule:
  - appointment `status` and transition `reason` must stay conceptually separate.
- Acceptance criteria:
  - booking lifecycle supports explicit lawyer actions,
  - client receives corresponding state and message,
  - statuses are deterministic and consistent.
- Verification:
  - tests for state transitions,
  - full regression suite,
  - manual lawyer/client flow check.

## B-007 — Client cannot correctly respond to proposed alternative time
- Severity: `P1`
- Status: `OPEN`
- Area: Booking lifecycle / client response
- Symptom:
  - If lawyer suggests another time, client-side response flow is incomplete or unclear.
- Acceptance criteria:
  - client can accept suggested time or choose another path,
  - resulting state transition is correct,
  - related notification is generated.
- Verification:
  - tests where practical,
  - full regression suite,
  - manual flow check.

---

# PHASE 4 — CASE CREATION / ACTIVATION / CLIENT CASE STATE

## B-008 — Booking does not deterministically create/activate a case after lawyer confirmation
- Severity: `P0`
- Status: `OPEN`
- Area: Cases / booking-to-case lifecycle
- Symptom:
  - Client can book consultation, but case still appears inactive/non-existent.
- Required business rule:
  - booking request ≠ active case,
  - lawyer confirmation should create or activate a case deterministically,
  - initial case status must be explicit.
- Acceptance criteria:
  - confirmed booking creates or activates case for client+lawyer pair,
  - case gets explicit initial status,
  - client sees consistent case state afterward.
- Verification:
  - tests where practical,
  - full regression suite,
  - manual confirm-booking-to-case check.

## B-009 — Client sees misleading “no case” state before lawyer confirmation
- Severity: `P1`
- Status: `OPEN`
- Area: Cases UX / documents gating
- Symptom:
  - Instead of a truthful waiting state, UI behaves like something is broken or absent.
- Acceptance criteria:
  - client sees explicit waiting/pre-case state,
  - messaging explains that documents/case access appears after lawyer confirmation,
  - no generic broken-state wording for expected lifecycle stages.
- Verification:
  - UI review,
  - full regression suite,
  - manual check.

## B-010 — “Cases” tab concept is not clearly aligned with product intent
- Severity: `P1`
- Status: `OPEN`
- Area: Product logic / client case UI / lawyer case workflow
- Product intent:
  - For client: case progress tracker, current status, next action, reduced need to message lawyer.
  - For lawyer: operational case entity.
- Acceptance criteria:
  - client-side case view emphasizes progress/status/next action,
  - pre-case and active-case states are clearly distinguished,
  - lawyer-side case view remains operational, not overloaded into the client mental model.
- Verification:
  - product/UI review,
  - manual flow checks.

---

# PHASE 5A — NOTIFICATION CORE (BADGE / UNREAD / EVENTS)

## B-011 — Unread notification badge/count is missing or unreliable
- Severity: `P1`
- Status: `OPEN`
- Area: Notifications / header UX
- Symptom:
  - Users do not clearly see that new notifications exist.
- Acceptance criteria:
  - bell icon shows unread count,
  - unread state updates reliably,
  - marking notifications read updates count correctly.
- Verification:
  - tests where practical,
  - full regression suite,
  - manual check.

## B-012 — Important booking/document events do not reliably generate in-app notifications
- Severity: `P1`
- Status: `OPEN`
- Area: Notification generation
- Required events:
  - new booking,
  - booking accepted,
  - booking rejected,
  - reschedule proposed,
  - slot invalidated / choose another time,
  - new client document,
  - appointment cancellation,
  - relevant case-status changes if applicable.
- Acceptance criteria:
  - these events create correct in-app notification records,
  - notification center distinguishes unread/read,
  - no silent missing event for core lifecycle actions.
- Verification:
  - tests where practical,
  - full regression suite,
  - manual event checks.

---

# PHASE 5B — NOTIFICATION SOUND (BEST EFFORT ONLY)

## B-013 — Optional notification sound is absent or inconsistent
- Severity: `P3`
- Status: `OPEN`
- Area: Notification UX enhancement
- Rule:
  - This is not a release blocker.
- Acceptance criteria:
  - if implemented, sound is best-effort and does not break UX,
  - if browser/WebView policy prevents autoplay, behavior is handled honestly.
- Verification:
  - real-device check only.

---

# PHASE 6 — NOTIFICATION PREFERENCES

## B-014 — Lawyer cannot configure which notifications to receive
- Severity: `P2`
- Status: `OPEN`
- Area: Notification settings / preferences
- Acceptance criteria:
  - lawyer can view and update notification preferences,
  - notification generation respects saved preferences where applicable,
  - defaults are sensible.
- Verification:
  - tests where practical,
  - full regression suite,
  - manual settings check.

---

# PHASE 7 — DOCUMENT UX CLEANUP

## B-015 — Duplicate upload button in lawyer documents UI
- Severity: `P2`
- Status: `OPEN`
- Area: Lawyer documents UI
- Acceptance criteria:
  - upload UX is consolidated into one coherent entry flow,
  - no duplicate/confusing primary upload control remains.
- Verification:
  - UI review,
  - full regression suite,
  - manual lawyer documents check.

---

# PREVIOUSLY IDENTIFIED CORE ISSUES THAT MUST ALSO REMAIN TRACKED

## B-016 — Same Telegram user may still enter wrong UI mode depending on launch context
- Severity: `P0`
- Status: `OPEN`
- Area: Role / launch / bot-source resolution
- Acceptance criteria:
  - client bot launch reliably opens client UI,
  - lawyer bot launch reliably opens lawyer UI,
  - same Telegram user can switch contexts deterministically.
- Verification:
  - tests where practical,
  - full regression suite,
  - manual dual-bot check.

## B-017 — Google Drive pseudo-upload path must not be exposed as real import
- Severity: `P2`
- Status: `OPEN`
- Area: Upload UX / misleading features
- Acceptance criteria:
  - no misleading active Google Drive upload entry point remains unless true import pipeline exists.
- Verification:
  - UI review,
  - manual check.

## B-018 — Download / view document flow must remain functional after all later fixes
- Severity: `P1`
- Status: `OPEN`
- Area: Documents / download contract
- Acceptance criteria:
  - documents can still be opened/downloaded from both relevant roles,
  - later changes do not regress the document lifecycle.
- Verification:
  - tests where practical,
  - full regression suite,
  - manual download/view check.

## B-019 — Lawyer ready-made upload into client case must remain functional after later fixes
- Severity: `P1`
- Status: `OPEN`
- Area: Lawyer documents / case upload
- Acceptance criteria:
  - lawyer can upload a prepared file into a client case,
  - later lifecycle changes do not regress this path.
- Verification:
  - tests where practical,
  - full regression suite,
  - manual lawyer case-upload check.

---

# FINAL STABILIZATION CHECKLIST

Before declaring the project stable, ensure all of the following are true:
- no reproducible `P0` or `P1` defects remain open,
- full verification suite passes,
- no broken core flows remain in:
  - auth / role routing,
  - booking,
  - cases,
  - documents,
  - notifications,
  - intake,
  - subscriptions / billing,
- all remaining limitations are explicitly documented,
- real-device Telegram validation needs are clearly listed.
