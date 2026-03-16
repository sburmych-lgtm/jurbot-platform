# IMPLEMENTATION_NOTES_BATCH_1

## Scope selected from DEFECT_LOG
Implemented in this unattended batch:
- D-001 (real upload payload instead of filename stub)
- D-003 (download/view contract + UI wiring)
- D-008 (lawyer upload ready-made file into case)
- D-002 (actionable no-active-case upload error)
- D-006 (invite tokens response-shape mismatch quick win)
- D-007 (invite link prefix formatting quick win)
- D-011 (restore clean typecheck)
- D-005 (client appointment cancellation; localized backend+UI)

Not implemented in this batch:
- billing/payment lifecycle redesign
- Google Drive full import redesign
- broad notification architecture rewrite

## Root-cause notes before changes
1. Upload pipeline used JSON `{name}` only and persisted synthetic text content.
2. Document cards had no wired download action and backend had no document download contract.
3. Lawyer "upload" UX only created local templates (localStorage), not case-linked uploaded files.
4. Invite tokens API shape expected by frontend differed from backend output.
5. Invite links were built with duplicated `inv_` prefix risk.
6. Typecheck failures were caused by implicit-any lambdas and fragile enum typing imports.
7. Appointment cancellation was restricted to lawyer route/service path only.

## Exact fixes implemented
### Backend
- Added multipart in-memory upload handling for documents (`multer`), accepting real file payload bytes.
- Replaced filename-only client upload path with binary-backed persistence using inline base64 encoding + Upload metadata record.
- Added lawyer upload endpoint: `POST /api/v1/documents/upload/lawyer` requiring `caseId` + file.
- Added protected download endpoint: `GET /api/v1/documents/:id/download` for lawyer/client scoped access.
- Added actionable no-active-case error message for client upload path.
- Extended appointment cancellation service to support owner client cancellation safely.
- Updated appointment delete route to allow authenticated lawyer or owning client.
- Typecheck hardening: explicit lambda parameter types and resilient local enum typing in token/subscription services.

### Frontend
- Added `api.postForm()` and `api.download()` to support multipart upload and binary file download with auth headers.
- Client documents page now uploads real file payload (`FormData`) and supports download action from cards.
- Lawyer documents page now supports direct file upload into selected case and supports downloads from generated list.
- Added explicit telemetry (`console.error`) in key document/settings/booking silent-failure paths.
- Fixed settings token parsing to support both array and `{items}` response shapes.
- Fixed invite link formatting to use raw token (`?start=<token>`).
- Added simple client-side cancellation controls for own upcoming appointments.

### Tests
- Updated authorization test to reflect new appointment remove signature.
- Added appointment service regression test proving client can cancel own appointment.

## Tradeoffs
- Chosen storage approach remains inline DB payload (`base64:` prefix in `Document.content`) plus `Upload` metadata record. This avoids broader storage infrastructure refactor in unattended pass.
- Download endpoint currently serves attachment content for both uploaded binary docs and text-generated docs; large-file optimization (stream object storage) intentionally deferred.
- Client cancellation UI is intentionally minimal and localized to booking page to reduce scheduling-architecture risk.
