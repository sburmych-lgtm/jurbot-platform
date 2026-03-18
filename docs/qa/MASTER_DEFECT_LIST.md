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
- Status: OPEN
- Area: Booking / datetime contract
- Symptoms:
  - client selects date and time
  - submit shows `Invalid datetime`
- Root-cause hypotheses:
  - frontend sends ambiguous local datetime
  - backend requires timezone-aware value
  - date/time concatenation is inconsistent
  - UTC/local conversion is wrong
- Acceptance criteria:
  - client can submit booking without `Invalid datetime`
  - stored appointment time matches the actual selected local time
  - lawyer sees the same intended appointment time
  - no hidden timezone shift
- Verification:
  - full regression suite
  - manual check: client selects a known time, lawyer sees the same time

## B-002 — Client document upload returns internal server error
- Priority: P0
- Status: OPEN
- Area: Documents / upload pipeline
- Symptoms:
  - client selects a file or image
  - upload fails with `Внутрішня помилка сервера`
- Root-cause hypotheses:
  - multipart contract mismatch
  - backend upload handler throws on business-rule failure
  - case linkage missing
  - mime/file handling failure
- Acceptance criteria:
  - supported file/image uploads succeed
  - expected user-state failures do NOT return generic 500
  - if upload is blocked, user sees precise actionable message
- Verification:
  - full regression suite
  - manual upload from client documents screen

## B-003 — "Скан" is misleading because it opens only normal camera capture
- Priority: P1
- Status: OPEN
- Area: Documents UX / camera flow
- Symptoms:
  - user expects scanner mode
  - current action opens ordinary camera capture only
- Required product behavior:
  - UI must not claim native scanning if it does not exist
- Acceptance criteria:
  - action renamed or clarified honestly, for example:
    - `Камера / фото документа`
    - `Сфотографувати документ`
  - if label remains scanner-like, helper text must explicitly state it opens camera capture
- Verification:
  - visual confirmation in client and lawyer upload flows

---

# PHASE 1 — Booking availability correctness

## B-010 — Past slots for the current day remain selectable/visible
- Priority: P0
- Status: OPEN
- Area: Booking availability
- Symptoms:
  - at late hour, user still sees morning/daytime slots for today
- Required fix:
  - server-side filtering for past slots of current day
  - client-side safety filter as backup
  - use one consistent app timezone rule
- Acceptance criteria:
  - outdated slots for today are unavailable automatically
  - both client and lawyer see only valid future slots
- Verification:
  - automated tests for current-day filtering
  - manual check using today's date

---

# PHASE 2 — Lawyer calendar visibility

## B-020 — Lawyer cannot see which dates contain bookings until clicking blindly
- Priority: P1
- Status: OPEN
- Area: Lawyer calendar / schedule
- Symptoms:
  - dates with pending/confirmed bookings are not visibly marked
- Required fix:
  - pre-highlight dates containing relevant appointments
- Acceptance criteria:
  - calendar visibly marks dates with appointments before click
  - manual guessing is no longer required
- Verification:
  - create appointments across multiple dates
  - lawyer calendar shows markers on those dates

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
- Status: OPEN
- Area: Cases / booking integration
- Product rule:
  - booking request does NOT automatically mean an active case
  - case is created or activated after lawyer confirms the booking
- Required fix:
  - on confirm, if no existing case for client+lawyer exists, create one
  - assign explicit initial case status, for example:
    - CONSULTATION_CONFIRMED
    - INTAKE_PENDING
- Acceptance criteria:
  - after confirmed booking, client has an active/visible case state
  - documents can attach to the correct case
- Verification:
  - confirm booking and verify case existence/status

## B-041 — Client sees broken or misleading "no case" state after booking
- Priority: P1
- Status: OPEN
- Area: Cases UX / documents gating
- Required pre-case messaging:
  - `Очікується рішення адвоката`
  - `Справа буде активована після підтвердження запису`
  - `Документи стануть доступні після підтвердження`
- Acceptance criteria:
  - no misleading generic error state before case activation
  - pre-case state is understandable to the client
- Verification:
  - booking submitted but not yet confirmed → correct message displayed

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
- Status: OPEN
- Area: Notifications UI
- Acceptance criteria:
  - unread count displayed on bell icon
  - works for both client and lawyer where applicable
  - read/unread state updates correctly
- Verification:
  - create notifications and confirm badge count changes

## B-051 — In-app notifications are generated inconsistently for key events
- Priority: P1
- Status: OPEN
- Area: Notifications backend/events
- Required events:
  - new booking
  - booking confirmed
  - booking rejected
  - reschedule proposed
  - slot invalidated / choose another time
  - new client document
  - appointment cancellation
  - relevant case state change
- Acceptance criteria:
  - each event generates correct in-app notification
  - notification center distinguishes unread vs read
- Verification:
  - trigger each event and confirm notification creation

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
