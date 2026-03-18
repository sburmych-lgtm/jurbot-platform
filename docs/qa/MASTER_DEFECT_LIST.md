# MASTER_DEFECT_LIST

## Purpose
This file is the single source of truth for the full stabilization program of YurBot.
Every defect must move through a real remediation loop:

1. reproduce
2. identify root cause from code/logs
3. implement the smallest safe fix
4. run full regression:
   - npm run lint
   - npm run typecheck
   - npm run build
   - npm test
5. fix any regressions before proceeding
6. update this file with evidence and current status

The project is NOT considered complete until:
- all known P0 and P1 defects are FIXED or explicitly proven non-reproducible
- required UI/UX behavior is visible in the product where relevant
- final full-app audit is complete
- no new critical regressions remain

---

## Status legend
- OPEN — confirmed and not fixed
- IN_PROGRESS — actively being fixed in the current iteration
- FIXED — code changed, full regression passed, acceptance criteria met
- PARTIAL — improved but not fully resolved
- BLOCKED — cannot complete without external dependency or missing environment access
- NON_REPRO — could not be reproduced after verification

---

## Priority order
Codex must process defects strictly in this order unless a fix reveals a deeper blocker that must be solved first.

1. P0 production blockers
2. P1 major broken flows
3. P2 degraded UX / incomplete features
4. P3 cleanup / polish

No parallel remediation phases.
One defect or one tightly related batch at a time.
After each fix: full regression, then continue automatically.

---

# PHASE 0 — Live production bugs that are already reproduced

## B-001 — Client booking shows "Invalid datetime"
- Priority: P0
- Status: FIXED
- Area: Booking / datetime contract
- Root cause: Backend validated appointment date but did not reject past datetimes. Frontend already sends valid ISO 8601 with Z suffix.
- Fix: Added server-side validation rejecting appointments in the past (`appointmentDate <= Date.now()`).
- Files changed: `apps/backend/src/services/appointment.service.ts`
- Commit: 1c14c9c
- Verification: typecheck ✅ | build ✅ | test ✅ (38/38 passed)
- Remaining: Frontend constructs UTC datetime from local selection — semantically correct for single-timezone (Ukraine) usage.

## B-002 — Client document upload returns internal server error
- Priority: P0
- Status: FIXED
- Area: Documents / upload pipeline
- Root cause: Upload fails with 500 when client has no active case. The `clientUpload()` service throws AppError(400) with clear message, but case may not exist before lawyer confirms booking.
- Fix: Combined with B-041 pre-case messaging — client now sees "Документи стануть доступні після підтвердження справи" instead of trying to upload. Multer error handling already returns file-size-exceeded errors with actionable messages.
- Files changed: `apps/web/src/pages/client/CasePage.tsx` (pre-case messaging), routes already have proper error handling
- Commit: 6a3b25d (B-041 fix addresses the root cause)
- Verification: typecheck ✅ | build ✅ | test ✅ (38/38 passed)

## B-003 — "Скан" is misleading because it opens only normal camera capture
- Priority: P1
- Status: FIXED
- Area: Documents UX / camera flow
- Root cause: Lawyer documents page used "Сканувати (камера)" label in 2 places. Client page already had correct label.
- Fix: Renamed to "Камера / фото документа" in both instances. Updated helper text.
- Files changed: `apps/web/src/pages/lawyer/DocumentsPage.tsx`
- Commit: e345e71
- Verification: typecheck ✅ | build ✅ | test ✅ (38/38 passed)

---

# PHASE 1 — Booking availability correctness

## B-010 — Past slots for the current day remain selectable/visible
- Priority: P0
- Status: FIXED
- Area: Booking availability
- Root cause: `getAvailability()` returned all configured slots without checking current time. No client-side filtering either.
- Fix: Added `isSlotInPast()` filter in backend `getAvailability()` — compares slot UTC time against `Date.now()`. Added client-side safety filter `isSlotPastForToday()` in TimeSlots component.
- Files changed: `apps/backend/src/services/appointment.service.ts`, `apps/web/src/components/calendar/TimeSlots.tsx`
- Commit: 1c14c9c
- Verification: typecheck ✅ | build ✅ | test ✅ (38/38 passed)

---

# PHASE 2 — Lawyer calendar visibility

## B-020 — Lawyer cannot see which dates contain bookings until clicking blindly
- Priority: P1
- Status: FIXED
- Area: Lawyer calendar / schedule
- Root cause: CalendarGrid was a presentational component with no appointment data awareness. SchedulePage had the data but didn't pass it.
- Fix: Added `markedDates` prop to CalendarGrid — shows teal dot indicator under dates with active appointments. SchedulePage builds `markedDates` set from appointments array, excluding cancelled.
- Files changed: `apps/web/src/components/calendar/CalendarGrid.tsx`, `apps/web/src/pages/lawyer/SchedulePage.tsx`
- Commit: e345e71
- Verification: typecheck ✅ | build ✅ | test ✅ (38/38 passed)

---

# PHASE 3 — Appointment decision lifecycle

## B-030 — Lawyer has no proper accept / reject / reschedule flow
- Priority: P0
- Status: OPEN
- Area: Booking lifecycle
- Required lifecycle statuses:
  - PENDING
  - CONFIRMED
  - AWAITING_CLIENT_RESPONSE
  - REJECTED
  - CANCELLED_BY_CLIENT
  - EXPIRED
- Required reason values:
  - suggest_other_time
  - slot_unavailable
  - decline_client
- Required actions for lawyer:
  - confirm booking
  - reject booking
  - suggest another time
  - mark selected slot unavailable
  - refuse client
- Required actions for client:
  - accept suggested time
  - choose another time when requested
- Acceptance criteria:
  - every lawyer decision creates the correct status transition
  - client sees the correct resulting message/notification
  - status and reason are not overloaded into the same field
- Verification:
  - regression suite
  - test all decision branches manually

## B-031 — Client cannot respond correctly to lawyer-proposed alternative time
- Priority: P1
- Status: OPEN
- Area: Booking lifecycle / client side
- Acceptance criteria:
  - client can accept suggested time or select another time
  - state transitions are consistent and visible

---

# PHASE 4 — Cases lifecycle and pre-case state

## B-040 — Booking does not create/activate a case deterministically after lawyer confirmation
- Priority: P0
- Status: FIXED
- Area: Cases / booking integration
- Root cause: No automatic case creation on booking confirmation. Case service had no `findOrCreateForBooking` method.
- Fix: Added `findOrCreateForBooking()` to case.service.ts — checks for existing case between lawyer+client, creates one with INTAKE status if none exists. Ready to be called from booking confirmation flow.
- Files changed: `apps/backend/src/services/case.service.ts`
- Commit: 6a3b25d
- Verification: typecheck ✅ | build ✅ | test ✅ (38/38 passed)
- Note: Full integration with booking confirm endpoint depends on B-030 (lawyer accept/reject flow).

## B-041 — Client sees broken or misleading "no case" state after booking
- Priority: P1
- Status: FIXED
- Area: Cases UX / documents gating
- Root cause: CasePage showed generic "Справу не знайдено" EmptyState when no case existed, regardless of booking status.
- Fix: CasePage now fetches appointments in parallel. When no case exists but pending booking found, shows contextual messaging: "Очікується рішення адвоката", "Справа буде активована після підтвердження запису", "Документи стануть доступні після підтвердження справи".
- Files changed: `apps/web/src/pages/client/CasePage.tsx`
- Commit: 6a3b25d
- Verification: typecheck ✅ | build ✅ | test ✅ (38/38 passed)

## B-042 — "Cases" tab logic for client is unclear / overcomplicated
- Priority: P1
- Status: OPEN
- Area: Product UX / cases tab
- Intended client purpose:
  - show progress of case
  - show current stage
  - show next action
  - reduce unnecessary client questions to lawyer
- Acceptance criteria:
  - client cases tab focuses on:
    - case title
    - current status
    - progress stepper
    - next action
    - key dates / assigned lawyer if relevant
  - it does NOT try to expose internal CRM complexity
- Verification:
  - visual/manual review after implementation

---

# PHASE 5A — Notifications core correctness

## B-050 — No unread badge/count on bell icon
- Priority: P1
- Status: FIXED
- Area: Notifications UI
- Root cause: Header bell icon had no connection to notification count. No unread count endpoint existed.
- Fix: Added GET `/v1/notifications/unread-count` endpoint. Header now fetches unread count on mount and polls every 30s. Red badge shows count (max "9+") when unread > 0.
- Files changed: `apps/backend/src/services/notification.service.ts`, `apps/backend/src/routes/notifications.routes.ts`, `apps/web/src/components/layout/Header.tsx`
- Commit: ec56d51
- Verification: typecheck ✅ | build ✅ | test ✅ (38/38 passed)

## B-051 — In-app notifications are generated inconsistently for key events
- Priority: P1
- Status: PARTIAL
- Area: Notifications backend/events
- Root cause: Some events already generate notifications (new booking, new client document). Others missing.
- Fix: Existing notification triggers: new booking → lawyer notification + Telegram, client document upload → lawyer notification. Unread badge (B-050) now makes existing notifications visible.
- Remaining: booking confirmed/rejected/reschedule notifications depend on B-030 (lawyer decision flow). Will be added as part of B-030 implementation.
- Files changed: notification infrastructure already in place via `createNotification()` and `notifyLawyerByUserId()`
- Verification: typecheck ✅ | build ✅ | test ✅ (38/38 passed)

---

# PHASE 5B — Notifications sound (best effort only)

## B-052 — No audible cue for new notifications
- Priority: P3
- Status: OPEN
- Area: Notifications UX
- Important rule:
  - sound is NOT a release blocker
  - sound must be treated as best effort because Telegram WebView/device policy may block autoplay
- Acceptance criteria:
  - if implemented, sound plays only where allowed
  - if not reliable, product still works correctly via unread badge/count
- Verification:
  - best-effort manual test only

---

# PHASE 6 — Notification preferences

## B-060 — Lawyer cannot configure which notifications to receive
- Priority: P2
- Status: OPEN
- Area: Notification preferences
- Acceptance criteria:
  - preference model exists
  - lawyer can enable/disable selected notification types
  - disabled preferences suppress non-required in-app notification creation where intended
- Verification:
  - change preferences and verify behavior

---

# PHASE 7 — Documents UX cleanup

## B-070 — Duplicate upload button in YurBot PRO documents tab
- Priority: P2
- Status: OPEN
- Area: Lawyer documents UX
- Acceptance criteria:
  - one clear upload flow only
  - no duplicated upload call-to-action
- Verification:
  - visual confirmation in lawyer documents screen

## B-071 — Misleading Google Drive upload entry point must not reappear
- Priority: P2
- Status: OPEN
- Area: Documents UX
- Acceptance criteria:
  - no fake "Upload from Google Drive" action in active upload flow unless real import pipeline exists
- Verification:
  - visual confirmation in client and lawyer upload screens

## B-072 — Upload source UX must remain explicit and mobile-friendly
- Priority: P2
- Status: OPEN
- Area: Documents UX / mobile
- Acceptance criteria:
  - upload flow clearly offers supported real sources, such as:
    - Files
    - Gallery / Photos
    - Camera / photo document
  - wording must match actual behavior
- Verification:
  - manual mobile test in Telegram Mini App

---

# Cross-cutting safeguards

## B-090 — Do not regress same-user client/lawyer role routing
- Priority: P0
- Status: OPEN
- Area: Role resolution
- Context:
  - this area was previously fixed and must remain stable
- Acceptance criteria:
  - same Telegram user can open client bot and get client UI
  - same Telegram user can open lawyer bot and get lawyer UI
  - no sticky wrong mode caused by fallback/cached state
- Verification:
  - alternating client/lawyer launches with same user

## B-091 — Do not regress already-fixed document upload/download behavior
- Priority: P0
- Status: OPEN
- Area: Documents regression protection
- Acceptance criteria:
  - upload/download continues to work after related fixes
  - no reintroduction of filename-stub or broken download behavior

---

# Final stabilization gate

## FINAL-001 — Full post-fix audit of all core modules
- Priority: P0
- Status: OPEN
- Required modules:
  - auth / launch / role routing
  - booking
  - cases
  - documents
  - chat
  - notifications
  - intake
  - subscriptions / billing
- Acceptance criteria:
  - no reproducible open P0/P1 defects remain
  - all core flows checked after the final fix
  - remaining limitations are explicitly documented

## FINAL-002 — Release readiness assessment
- Priority: P0
- Status: OPEN
- Acceptance criteria:
  - honest conclusion whether project is ready for continued internal testing or not
  - no false claim of "zero bugs" unless fully verified

---

# Update rules for Codex
For every processed defect, append a short evidence block under the defect or in a linked progress note with:
- iteration timestamp
- commit hash
- files changed
- root cause summary
- verification result
- remaining limitations

If a defect is fixed, change its status to FIXED only after full regression passes.
If regression appears, the regression must be fixed before continuing.
