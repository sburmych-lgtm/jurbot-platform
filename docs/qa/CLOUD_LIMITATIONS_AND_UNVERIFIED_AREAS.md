# CLOUD_LIMITATIONS_AND_UNVERIFIED_AREAS

## Requires local verification
- Real filesystem persistence semantics for uploads (especially if local path storage is used in dev).
- End-to-end browser download behavior for generated/uploaded docs.
- Clipboard behavior for invite links across OS/browser combinations.

## Requires staging verification
- Payment provider integration (when implemented): webhooks, retries, idempotency, subscription transitions.
- Telegram webhook delivery under real network conditions and secret validation.
- Observability: logs, alerting, correlation IDs across backend + bot processes.

## Requires real Telegram mobile device test
- Telegram Mini App launch parameters (`startapp=lawyer|client`) consistency.
- Mobile file picker behavior inside Telegram WebView (files/gallery/camera).
- Google Drive external open and user-return flow.
- Push-style notification user experience and delivery timing.
- Same Telegram person using both bots without role bleed.

## Uncertainty notes
- User-provided external documents referenced in IDE context were not accessible in this container, so comparisons against those specific handover notes could not be performed directly.
- No cloud test in this pass can prove production Telegram UX correctness without live bot/webhook environment and mobile clients.
