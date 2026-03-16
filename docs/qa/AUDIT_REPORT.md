# AUDIT_REPORT

## Architecture summary
- Monorepo with `apps/web` (React/Vite Mini App), `apps/backend` (Express + Prisma API), `packages/db` (Prisma schema/client), `packages/telegram` (Grammy bot logic), `packages/shared` (schemas/types/constants).
- API route surface is modular (`/v1/cases`, `/v1/documents`, `/v1/appointments`, `/v1/intake`, `/v1/tokens`, `/v1/subscription`, etc.).
- Authentication supports JWT and Telegram initData (`authenticate` + `telegramAuth`/`flexAuth`).

## Repository health
- Build: passes.
- Tests: pass (29 tests).
- Lint: passes with warnings.
- Typecheck: **fails** (strict TS + Prisma enum import/type issues).
- Existing tests cover important auth regressions but do not cover all product-critical mobile/Telegram flows.

## Highest-risk modules
1. Document upload/download lifecycle.
2. Invite flow + token UX consistency.
3. Appointment lifecycle (client cancellation gap).
4. Subscription/payment completeness.
5. Notification side effects and real Telegram delivery parity.

## Broken flows and degraded flows
- Client web upload does not persist actual file binary.
- No end-user download/view action for stored documents.
- Lawyer cannot upload arbitrary ready-made file directly into a case (only local template parsing UX).
- Client cannot cancel appointment.
- Settings token list contract mismatch can hide tokens in UI.
- Invite link generation likely produces malformed token URL.
- Typecheck gate is broken on main branch.

## Misleadingly “implemented” but non-working / incomplete
- Google Drive option appears as import feature but is actually external-link workaround.
- Subscription section looks productized in UI but lacks payment pipeline.
- Message flow exists, but push-style recipient notification from in-app sends is incomplete.

## Missing observability / logging
- Several frontend `catch {}` blocks swallow errors with no structured telemetry.
- Upload and messaging paths need structured event logging (who, caseId, orgId, channel).
- No explicit audit trails for invite resolution and failed token usage in user-facing QA signals.

## Likely production blockers
- P0 upload/document lifecycle gaps.
- P0 subscription/payment incompleteness.
- P0 lawyer upload-to-case missing.
- Any release with broken typecheck gate is high operational risk.

## What is safe to keep
- Core route/service decomposition and role-aware scoping patterns are much stronger than early snapshots.
- Telegram initData validation approach and dual-mode auth model are structurally sound.
- Security regression test direction (authorization suite) is good foundation.

## Must fix before release
1. End-to-end binary file upload/download pipeline for both roles.
2. Invite token UX/data contract fixes.
3. Client appointment cancellation.
4. Billing workflow implementation.
5. Typecheck gate restoration + CI enforcement.
6. Notification side-effect coverage for in-app messaging.
