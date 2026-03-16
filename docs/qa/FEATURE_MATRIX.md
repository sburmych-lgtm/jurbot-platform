# FEATURE_MATRIX

| Module | Intended behavior | Implemented status | Confidence | Missing / gaps | Verification method |
|---|---|---|---|---|---|
| Mini App bootstrap & routing | Detect Telegram context and route by role/startapp | **Partial** | High | Bot source can override DB role (intentional), but still requires real same-user dual-bot validation in Telegram mobile | Code review + real Telegram mobile test |
| Telegram auth (`initData`) | Validate HMAC + map Telegram identity to platform user | **Implemented** | Medium-High | Requires staging check for token correctness and clock skew; no cloud live Telegram webhook test in this audit | Code review + staging webhook test |
| Lawyer registration (bot + app) | Register lawyer and open lawyer Mini App | **Implemented** | Medium | Cloud cannot fully verify real Telegram UX onboarding end-to-end | Existing tests + real device |
| Client registration via invite token | Register client via token and bind to lawyer/org | **Partial** | Medium | Intake public submission path is not explicitly invite-bound; token UX in settings has potential link formatting/data-shape issues | Code review + manual invite flow |
| Lawyer-client linking / tenant isolation | Keep all cross-entity access org-scoped | **Mostly implemented** | Medium | Needs regression depth beyond current test surface and DB-level negative tests | Tests + security regression suite |
| Cases | Lawyer CRUD, client own read | **Implemented** | Medium-High | Requires staging validation for edge authorization scenarios | Unit tests + API integration tests |
| Clients list/profile | Lawyer sees same-org clients only | **Partial** | Medium | Route guards exist, but broad user service exposure still needs full abuse-case testing | Code review + integration tests |
| Scheduling / appointments | Availability + booking + cancel | **Partial** | High | Client cancellation missing by API and UI (lawyer-only delete); notification sync not fully proven | Code review + manual flow |
| Documents (AI + uploads) | Generate, upload, view/download, case linkage | **Partial** | High | No true binary upload API in web path; no download endpoint wired in UI; lawyer cannot upload file into client case backend path | Code review + E2E/manual |
| Messages | Case-based two-way messaging + alerts | **Partial** | Medium | In-app message create lacks push notification trigger path; silent catch blocks on client UI | Code review + manual cross-user test |
| Notifications | Persist + read + optional Telegram send | **Partial** | Medium | “Push-style” completeness unclear for some flows; requires staging/Telegram verification | Code review + real Telegram device |
| Intake | Public form, lawyer review, convert to case | **Partial** | Medium | Invite-token tie-in unclear from public form path; real lifecycle needs end-to-end validation | Code review + staging flow |
| Subscription/payment | Plan + usage visibility + limits | **Partial / not production-ready** | High | Billing/checkout/webhook not present; read-only status endpoints and plan text only | Code review |
| Google Drive assist flow | Allow import from Drive in Telegram constraints | **Partial** | High | Only opens Drive externally + asks user to re-pick local file; no direct import pipeline | Code review + real device UX |
| Test suite health | Prevent regressions across auth/telegram/appointments | **Partial** | High | Security tests exist but broader e2e/perf/mobile coverage missing | `npm test` + gap analysis |
