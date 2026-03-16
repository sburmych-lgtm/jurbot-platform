# YurBot Audit Plan (Cloud QA Pass)

## Scope
- Repository-wide audit of backend, frontend, shared schemas, Prisma models, Telegram bot handlers, and tests.
- Focus on multi-tenant isolation, role separation, Telegram Mini App routing (`startapp=lawyer|client`), uploads/documents, appointments, intake, notifications, subscriptions.
- No production code changes during this audit.

## Audit Method
1. **Static architecture scan**
   - Monorepo workspaces, entrypoints, route map, services map, Prisma model relationships.
2. **Runtime baseline checks**
   - `npm install`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`.
3. **Risk-oriented code review**
   - Authorization boundaries (route + service level).
   - Token/invite and org scoping.
   - Upload pipeline and document lifecycle.
   - Telegram initData auth and bot callbacks.
4. **Defect extraction and prioritization**
   - P0/P1/P2/P3 with impact and evidence.
5. **Remediation sequencing**
   - Fastest safe fix order + dependency map.
6. **Manual QA test design**
   - Real Telegram mobile and staging checks called out explicitly.

## Explicit Pain-Point Coverage
- Mobile file picker in Telegram WebView.
- Google Drive “open only” behavior.
- Client upload stores metadata, not binary payload.
- Upload blocked when no active case.
- Cross-role startapp behavior and same Telegram identity path.
- Notification completeness and “push-like” behavior.
- Download/view document action parity.
- Intake↔invite wiring.
- Client appointment cancellation.
- Subscription/payment completeness.
- Lawyer direct file upload into client case.

## Evidence Sources
- Source files under `apps/backend`, `apps/web`, `packages/*`, `tests/*`.
- Runtime command output captured in this audit session.

## Non-Goals
- No implementation or refactor in this pass.
- No environment-specific cloud infra changes.
