# DEFECT_LOG

## D-001
- **Title:** Client web upload stores filename stub, not actual file payload
- **Severity:** P0
- **User role affected:** Client, Lawyer
- **Module affected:** Documents upload pipeline
- **Exact symptom:** Web client sends `{ name }` only; backend stores synthetic `upload:web:<name>:<ts>` content.
- **Likely root cause:** No multipart/file-byte handling in `/v1/documents/upload`.
- **Evidence:** Route builds synthetic `content` from name; frontend posts only name.
- **Affected files:** `apps/backend/src/routes/documents.routes.ts`, `apps/web/src/pages/client/DocumentsPage.tsx`
- **Reproduction steps:** Select file in client docs page → upload → inspect stored document content/size.
- **Recommended fix:** Add multipart endpoint (multer/S3/local), persist file metadata + storage URL/hash.
- **Regression test to add:** API integration test posting multipart file verifies non-synthetic storage fields.
- **Can verify in cloud?:** yes (API behavior)
- **Requires real Telegram mobile test?:** yes (picker/upload UX)

## D-002
- **Title:** Client upload blocked when no active case (hard fail, no guided fallback)
- **Severity:** P1
- **User role affected:** Client
- **Module affected:** Documents upload
- **Exact symptom:** Upload returns 400 if no active non-completed case.
- **Likely root cause:** Strict `activeCase` requirement without draft inbox/unassigned upload.
- **Evidence:** `clientUpload` throws if no active case.
- **Affected files:** `apps/backend/src/services/document.service.ts`
- **Reproduction steps:** Client without active case uploads document.
- **Expected result:** Offer intake/case request path or pending queue.
- **Actual result:** Error only.
- **Recommended fix:** Add temporary holding area or create pending intake attachment bucket.
- **Regression test to add:** Upload without active case returns actionable response contract.
- **Can verify in cloud?:** yes
- **Requires real Telegram mobile test?:** no

## D-003
- **Title:** No document download/view backend contract for generated/uploaded docs
- **Severity:** P0
- **User role affected:** Lawyer, Client
- **Module affected:** Documents retrieval
- **Exact symptom:** UI cards show items, but no implemented download endpoint and no `onDownload` wiring.
- **Likely root cause:** Document lifecycle ended at metadata listing.
- **Evidence:** `DocumentCard` supports optional `onDownload`, pages pass none; routes expose no file stream endpoint.
- **Affected files:** `apps/web/src/components/documents/DocumentCard.tsx`, `apps/web/src/pages/*/DocumentsPage.tsx`, `apps/backend/src/routes/documents.routes.ts`
- **Reproduction steps:** Open docs list and attempt to download/view file.
- **Recommended fix:** Add signed URL/stream endpoint + UI download action.
- **Regression test to add:** API test for download auth; e2e click-download flow.
- **Can verify in cloud?:** yes (code-level)
- **Requires real Telegram mobile test?:** yes (viewer behavior)

## D-004
- **Title:** Google Drive flow is open-link fallback only; no import into app
- **Severity:** P1
- **User role affected:** Lawyer, Client
- **Module affected:** File acquisition UX
- **Exact symptom:** “Open Google Drive” only opens external page and asks manual re-upload.
- **Likely root cause:** No Picker token/OAuth callback integration in Telegram WebView path.
- **Evidence:** `openGoogleDrive()` only opens URL; no file transfer logic.
- **Affected files:** `apps/web/src/lib/google-picker.ts`, docs pages
- **Reproduction steps:** Tap Google Drive button in docs pages.
- **Recommended fix:** Explicit fallback UX + optional backend import via Drive API outside WebView.
- **Regression test to add:** UI contract test ensures fallback messaging and completion path.
- **Can verify in cloud?:** partial
- **Requires real Telegram mobile test?:** yes

## D-005
- **Title:** Client cannot cancel own appointment (API and UI restriction)
- **Severity:** P1
- **User role affected:** Client
- **Module affected:** Appointments
- **Exact symptom:** `DELETE /appointments/:id` is LAWYER-only; client booking page has no cancellation control.
- **Likely root cause:** Missing client cancel use case implementation.
- **Evidence:** Route role guard and booking page flow.
- **Affected files:** `apps/backend/src/routes/appointments.routes.ts`, `apps/web/src/pages/client/BookingPage.tsx`
- **Reproduction steps:** Client books appointment and tries to cancel.
- **Recommended fix:** Add client self-cancel endpoint with ownership/status guards + UI button.
- **Regression test to add:** Client can cancel own pending/confirmed appointment only.
- **Can verify in cloud?:** yes
- **Requires real Telegram mobile test?:** yes

## D-006
- **Title:** Invite tokens list contract mismatch in settings page
- **Severity:** P1
- **User role affected:** Lawyer
- **Module affected:** Settings/invite flow
- **Exact symptom:** Frontend expects `{items}` but backend returns array; tokens can render empty.
- **Likely root cause:** API response shape mismatch.
- **Evidence:** `api.get<{ items: TokenItem[] }>` with `setTokens(tokRes.data?.items ?? [])`; backend sends `data: tokens`.
- **Affected files:** `apps/web/src/pages/lawyer/SettingsPage.tsx`, `apps/backend/src/routes/tokens.routes.ts`
- **Reproduction steps:** Open settings and inspect invite tokens after existing token creation.
- **Recommended fix:** Align contract (either backend wrap or frontend parse array).
- **Regression test to add:** Frontend integration test for token list rendering.
- **Can verify in cloud?:** yes
- **Requires real Telegram mobile test?:** no

## D-007
- **Title:** Invite link builder may double-prefix token (`inv_inv_*`)
- **Severity:** P1
- **User role affected:** Lawyer, Client
- **Module affected:** Invite flow
- **Exact symptom:** Link built as `?start=inv_${token}` while token already has `inv_` prefix.
- **Likely root cause:** Prefix duplication logic in UI.
- **Evidence:** `copyInviteLink` concatenation and token format from service.
- **Affected files:** `apps/web/src/pages/lawyer/SettingsPage.tsx`, `apps/backend/src/services/token.service.ts`
- **Reproduction steps:** Create token, copy link, test in Telegram.
- **Recommended fix:** Use raw token in link.
- **Regression test to add:** Unit test for invite link formatter.
- **Can verify in cloud?:** yes
- **Requires real Telegram mobile test?:** yes

## D-008
- **Title:** Lawyer “upload ready-made file into client case” not implemented server-side
- **Severity:** P0
- **User role affected:** Lawyer
- **Module affected:** Documents / case collaboration
- **Exact symptom:** Lawyer can upload template into localStorage, but cannot attach binary file to client case document record.
- **Likely root cause:** UI feature implemented as local template vault; missing backend endpoint.
- **Evidence:** Lawyer docs page reads file text and stores in localStorage only.
- **Affected files:** `apps/web/src/pages/lawyer/DocumentsPage.tsx`, `apps/backend/src/routes/documents.routes.ts`
- **Reproduction steps:** Lawyer uploads file in docs page and expects client case attachment.
- **Recommended fix:** Add lawyer upload-to-case endpoint + UI case selector + storage persistence.
- **Regression test to add:** Integration test attaches file to target case with auth checks.
- **Can verify in cloud?:** yes
- **Requires real Telegram mobile test?:** optional

## D-009
- **Title:** In-app message send lacks guaranteed notification trigger/push behavior
- **Severity:** P1
- **User role affected:** Lawyer, Client
- **Module affected:** Messaging + notifications
- **Exact symptom:** API `messageService.create` writes DB record only; no automatic notify counterpart in route/service.
- **Likely root cause:** Missing side-effect orchestration for chat events.
- **Evidence:** `message.service.ts` create has no notification dispatch.
- **Affected files:** `apps/backend/src/services/message.service.ts`, `apps/backend/src/routes/cases.routes.ts`
- **Reproduction steps:** Send message via web app and check recipient notifications.
- **Recommended fix:** Dispatch notification/Telegram event on message create.
- **Regression test to add:** Message creation emits notification for opposite participant.
- **Can verify in cloud?:** partial
- **Requires real Telegram mobile test?:** yes

## D-010
- **Title:** Subscription/payment flow incomplete (no checkout/webhook lifecycle)
- **Severity:** P0
- **User role affected:** Lawyer/org owner
- **Module affected:** Billing
- **Exact symptom:** Read-only subscription retrieval exists, but no payment initiation, webhook, plan change, or renewal execution path.
- **Likely root cause:** Feature not fully implemented.
- **Evidence:** only `GET /subscription`; service offers plan limits helpers only.
- **Affected files:** `apps/backend/src/routes/subscription.routes.ts`, `apps/backend/src/services/subscription.service.ts`
- **Reproduction steps:** Attempt to upgrade from UI/settings.
- **Recommended fix:** Add payment provider integration and status transition handlers.
- **Regression test to add:** webhook-driven state transition tests.
- **Can verify in cloud?:** yes
- **Requires real Telegram mobile test?:** no

## D-011
- **Title:** Typecheck pipeline broken on main branch
- **Severity:** P1
- **User role affected:** Engineering/release
- **Module affected:** CI quality gates
- **Exact symptom:** `npm run typecheck` fails on implicit any and prisma type exports (`TokenType`, `SubscriptionPlan`).
- **Likely root cause:** TS strict drift and Prisma enum typing mismatch in imports.
- **Evidence:** audit command output.
- **Affected files:** `packages/telegram/src/config.ts`, `apps/backend/src/services/subscription.service.ts`, `apps/backend/src/services/token.service.ts`, others
- **Reproduction steps:** run `npm run typecheck`.
- **Recommended fix:** fix typing/import paths and enforce CI gate.
- **Regression test to add:** CI required typecheck.
- **Can verify in cloud?:** yes
- **Requires real Telegram mobile test?:** no

## D-012
- **Title:** Intake public flow not explicitly tied to invite token context
- **Severity:** P2
- **User role affected:** Client, Lawyer
- **Module affected:** Intake / lead attribution
- **Exact symptom:** Public intake form submits without token; lawyer attribution uncertain unless existing org linkage already set.
- **Likely root cause:** intake submission path independent from invite token resolver.
- **Evidence:** intake route accepts schema payload and service creates/fetches user without token requirement.
- **Affected files:** `apps/backend/src/routes/intake.routes.ts`, `apps/backend/src/services/intake.service.ts`, `apps/web/src/pages/public/IntakeFormPage.tsx`
- **Reproduction steps:** submit intake from direct link without invite context.
- **Recommended fix:** allow optional invite token in intake payload and persist source attribution.
- **Regression test to add:** intake submission with/without token preserves expected org binding.
- **Can verify in cloud?:** partial
- **Requires real Telegram mobile test?:** no
