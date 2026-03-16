# FIX_PLAN

## Safest fix order (priority-first)
1. **Stabilize engineering gates**
   - Fix `npm run typecheck` failures.
   - Make typecheck mandatory in CI.
2. **Repair core document lifecycle**
   - Multipart upload endpoints (client + lawyer-to-case).
   - Storage adapter + metadata schema.
   - Download/view endpoint with auth checks.
3. **Fix invite flow reliability**
   - Normalize token API contract.
   - Fix invite URL formatter.
   - Validate token lifecycle in UI and bot.
4. **Close appointment lifecycle gap**
   - Add client cancel endpoint + UI affordance + status transitions.
5. **Complete notification side effects**
   - Message send triggers notification + Telegram fanout (where configured).
   - Add idempotency and failure logging.
6. **Implement billing flow**
   - Payment initiation endpoint, provider webhook handler, subscription transitions.

## Grouped fix batches
- **Batch A (Quick wins, low risk):** API contract mismatch, invite URL formatter, swallowed error logging improvements.
- **Batch B (Core functionality):** file upload/download pipeline, lawyer upload-to-case.
- **Batch C (Lifecycle completeness):** client cancel appointment, message notification triggers.
- **Batch D (Platform readiness):** payment integration and plan transition automation.

## Quick wins
- Frontend token list response parsing alignment.
- Remove double `inv_` prefix in copied links.
- Expose clearer UX error text for no-active-case upload path.
- Add telemetry where catches are empty.

## Dangerous refactors
- Storage abstraction and migration from inline text `content` to durable file object model.
- Billing integration touching subscription enforcement middleware.
- Telegram notification orchestration changes that affect both bots.

## Dependencies between fixes
- Download endpoint depends on storage model decisions.
- Lawyer upload-to-case depends on shared upload pipeline.
- Accurate notification fanout depends on normalized message/case ownership graph.
- Billing UI actions depend on backend payment lifecycle endpoints.

## What should be fixed before anything else
- Typecheck gate and document lifecycle (upload/download) are first-line release blockers.
