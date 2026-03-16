# MANUAL_QA_CHECKLIST

## Environment prerequisites
- Staging backend + web build with valid Telegram bot tokens.
- At least 2 Telegram accounts/devices (lawyer and client personas).
- Seeded org + clean org scenario.

## Lawyer bot scenarios (real Telegram mobile)
- [ ] `/start` onboarding completes and opens Mini App with `startapp=lawyer`.
- [ ] Menu button keeps opening lawyer interface after re-login.
- [ ] Invite token creation message includes valid client bot link.
- [ ] Lawyer receives notification when client sends message/upload.

## Client bot scenarios (real Telegram mobile)
- [ ] `/start` with valid invite token links client to intended lawyer/org.
- [ ] Mini App opens with `startapp=client` and correct interface.
- [ ] Client cannot access lawyer-only actions/routes.

## Invite flow
- [ ] Copy invite link from lawyer settings and open from fresh client account.
- [ ] Expired/disabled token gives actionable error.
- [ ] Token usage count increments correctly.

## Startapp separation
- [ ] Same Telegram human account opening lawyer bot and client bot gets proper interface each time.
- [ ] No stale role bleed after logout/login/app reopen.

## Upload from device (mobile)
- [ ] Upload document from file system in client Mini App.
- [ ] Validate real file is persisted and later downloadable.
- [ ] Upload behavior when no active case shows guided fallback (not dead-end error).

## Gallery / camera
- [ ] Client bot photo upload attaches to active case and notifies lawyer.
- [ ] File metadata (name/type/size) is correct.

## Google Drive fallback behavior
- [ ] “Open Google Drive” opens successfully in Telegram context.
- [ ] User can complete fallback steps and import chosen file into app.
- [ ] UX text clearly explains non-direct import limitation.

## Document download/view
- [ ] Lawyer can open/download generated document.
- [ ] Client can open/download own uploaded and lawyer-shared documents.
- [ ] Unauthorized cross-case access denied.

## Appointment booking
- [ ] Client books available slot; lawyer sees appointment.
- [ ] Conflict slots are blocked.
- [ ] Notifications sent to lawyer/client as expected.

## Appointment cancellation
- [ ] Client can cancel own eligible appointment.
- [ ] Lawyer can cancel appointment.
- [ ] Cancellation emits notifications and updates UI status.

## Notifications
- [ ] In-app notifications list updates after message/upload/appointment events.
- [ ] Telegram push message delivered for configured events.
- [ ] Read/unread transitions sync correctly.

## Messages
- [ ] Client message to lawyer via Mini App appears in lawyer context.
- [ ] Lawyer reply appears for client.
- [ ] Push-style alert generated for receiver.

## Cross-role and tenant validation
- [ ] Lawyer A cannot access Lawyer B org clients/cases/docs/appointments.
- [ ] Client cannot access other client data by ID tampering.
- [ ] Invite tokens cannot be deactivated by other lawyers.
