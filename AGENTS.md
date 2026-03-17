# AGENTS.md

## Purpose
This repository is being stabilized through an iterative production-remediation program.
The goal is not to produce optimistic summaries. The goal is to eliminate known reproducible defects while preserving application stability.

This file is the operating contract for Codex and any other coding agent working in this repository.

---

## Core mission
You must:
1. fix known defects sequentially,
2. verify the whole app after every fix,
3. prevent regressions,
4. keep the defect list up to date,
5. finish with a full stabilization audit.

You must NOT:
- hide unresolved issues behind optimistic wording,
- claim a fix without verification,
- skip regression checks,
- expand scope unnecessarily,
- parallelize unrelated remediation phases.

---

## Source of truth
Always use these artifacts as the control layer:
- `docs/qa/MASTER_DEFECT_LIST.md`
- `docs/qa/AUDIT_REPORT.md` if present
- `docs/qa/DEFECT_LOG.md` if present
- `docs/qa/FIX_PLAN.md` if present
- actual repository code and current verification results

If any documents conflict with the actual codebase, explicitly document the conflict and use the real code state as implementation reality.

---

## Execution model
Work autonomously.
Do not ask follow-up questions unless blocked by missing repository access or missing required secrets/configuration.
Operate in the current branch if that is how the operator launched the task.
Do not create additional branches unless explicitly requested.

Use only the mounted repository workspace.
Do not use:
- Windows absolute paths,
- `file://` URLs,
- Playwright to read repository source files.

---

## Mandatory remediation loop
For each iteration:

1. Select the highest-priority `OPEN` defect from `docs/qa/MASTER_DEFECT_LIST.md`.
2. Read the relevant files first.
3. Explain the root cause from code before editing.
4. Implement the smallest safe production-grade fix.
5. Add or update tests where practical.
6. Run the full verification suite:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run build`
   - `npm test`
7. If any regression appears, fix the regression before moving on.
8. Update `docs/qa/MASTER_DEFECT_LIST.md`:
   - status,
   - root cause,
   - files changed,
   - verification evidence,
   - residual limitations.
9. Only then move to the next defect.

No defect is considered complete until the full verification suite has been run after the fix.

---

## No parallel remediation
Do NOT run parallel remediation streams.
Do NOT process unrelated phases simultaneously.
Do NOT batch large unrelated changes together just to save time.

Allowed batching rule:
- You may batch defects only when they belong to the same lifecycle or the same tightly coupled code path.

Examples of acceptable small batches:
- booking datetime parsing + same booking payload validation
- client upload 500 + friendly upload business-rule error state
- lawyer decision flow + case activation state transition

Examples of unacceptable batching:
- booking lifecycle + billing + notification preferences + document UX in one pass

---

## Verification policy
After every fix or tightly related micro-batch, run the full repository verification suite.
Do not skip full verification just because the change "looks local".

If any command fails:
1. capture the exact failure,
2. determine whether it is pre-existing or introduced by the current changes,
3. fix introduced regressions first,
4. document any genuinely pre-existing blockers precisely.

---

## Release truthfulness policy
Do NOT claim:
- "all bugs fixed"
- "zero bugs"
- "production complete"
- "fully verified"

unless ALL of the following are true:
1. all known defects in `MASTER_DEFECT_LIST.md` are marked `FIXED`, `NON_REPRODUCIBLE`, or explicitly `DEFERRED` with rationale,
2. no open `P0` or `P1` defects remain,
3. full verification suite passes,
4. final stabilization audit finds no broken core flows,
5. remaining mobile/Telegram-only uncertainty is explicitly documented.

If real-device Telegram behavior cannot be verified in the current environment, say so clearly.

---

## High-risk domains that require extra caution
These areas must be treated as high-risk and re-validated repeatedly:
- role / launch / bot-source resolution,
- client booking flow,
- lawyer booking decision flow,
- case activation logic,
- client and lawyer document flows,
- notification generation and unread state,
- same-user dual-bot behavior,
- mobile upload source UX,
- datetime and timezone handling.

---

## Product-state rules

### Booking lifecycle
Appointment status and reason must not be overloaded into one field.
Prefer this model:
- status = current lifecycle state
- reason = why a transition occurred

Expected appointment states:
- `PENDING`
- `CONFIRMED`
- `AWAITING_CLIENT_RESPONSE`
- `REJECTED`
- `CANCELLED_BY_CLIENT`
- `EXPIRED`

Expected appointment reasons may include:
- `suggest_other_time`
- `slot_unavailable`
- `decline_client`

If the actual repository uses different naming, preserve consistency but keep the same separation of concerns.

### Case lifecycle
A booking request is NOT automatically an active case.
When the lawyer confirms a booking, the system should create or activate the case deterministically.
Case creation must assign an explicit initial case status, such as:
- `CONSULTATION_CONFIRMED`
- `INTAKE_PENDING`
- or the closest equivalent already present in the repository.

The client-facing UI must not show a misleading raw “no case” state when the true state is:
- waiting for lawyer decision,
- booking not yet confirmed,
- case will activate after confirmation.

### Notifications
Unread badge/count is core functionality.
Sound is optional best-effort functionality.
Do not treat sound playback as a release blocker unless the repository explicitly depends on it.

### Scan / camera UX
Do not claim native document-scanner capability if the implementation is only camera capture.
If the UI opens a standard camera capture flow, label it honestly.

---

## Required reporting for every iteration
Each iteration summary must include:
1. defect ID and title,
2. root cause,
3. exact files changed,
4. exact fix applied,
5. tests added or updated,
6. full verification results,
7. whether any regressions appeared,
8. updated defect status,
9. remaining real-device Telegram validation needs.

---

## Final stabilization phase
After all known defects have been processed:
1. run a full stabilization pass,
2. re-run the full verification suite,
3. re-audit all major application modules and flows,
4. detect any remaining broken, misleading, incomplete, or non-functional flows,
5. fix newly confirmed critical issues using the same loop,
6. update `MASTER_DEFECT_LIST.md` one final time.

Core flows to re-audit at the end:
- auth / launch / role routing,
- booking,
- cases,
- documents,
- chat / messages,
- notifications,
- intake,
- subscriptions / billing,
- lawyer UI and client UI navigation.

---

## Definition of done
The stabilization program is only considered complete when:
- no reproducible open `P0` or `P1` defects remain,
- all known defects are processed and documented,
- full verification suite passes,
- no newly introduced regressions remain,
- final audit shows no broken core flows,
- remaining Telegram/device-specific uncertainty is explicitly listed.
