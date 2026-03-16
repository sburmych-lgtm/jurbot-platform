---
name: telegram-ux-edit
description: Edit Telegram bot messages, buttons, registration flows, and UX for the JurBot dual-bot system (lawyer bot + client bot). Use this skill when the user asks to change bot messages, modify registration flow, add/remove buttons, change specializations, fix callback handlers, update welcome messages, or adjust the Mini App button. Triggers on "telegram message", "bot text", "registration flow", "спеціалізації", "кнопка відкрити юрбот", "callback handler", "welcome message", or any Telegram bot UX change.
---

# Telegram UX Editing for JurBot

Edit messages, buttons, and flows for the JurBot dual-bot Telegram system.

## Architecture

JurBot has TWO separate Telegram bots:

1. **Lawyer Bot** (`TELEGRAM_LAWYER_TOKEN`) — Registration, profile setup, case management notifications
2. **Client Bot** (`TELEGRAM_CLIENT_TOKEN`) — Registration via invite link, booking notifications

Both bots use the **Grammy** framework and share a Mini App (web frontend).

## Key files

### Bot configuration and messages
```
packages/telegram/src/config.ts           — Bot config, message templates, specializations, CTA texts
packages/telegram/src/index.ts            — Bot initialization and exports
```

### Lawyer bot handlers
```
packages/telegram/src/lawyer/             — Lawyer bot conversation handlers
apps/backend/src/lib/telegram.ts          — Bot webhook setup and integration with backend
```

### Client bot handlers
```
packages/telegram/src/client/             — Client bot conversation handlers
```

### Shared utilities
```
packages/telegram/src/shared/             — Shared keyboard builders, message formatters
```

### Backend integration
```
apps/backend/src/services/notification.service.ts  — Send notifications via bots
apps/backend/src/routes/telegram.routes.ts         — Webhook endpoints
apps/backend/src/lib/telegram.ts                   — Bot instances + webhook registration
```

## Editing workflow

### Step 1: Identify what to change

Read `packages/telegram/src/config.ts` first — this is the central configuration for:
- Specialization list (e.g., adding "військове право" / MILITARY)
- Registration flow messages
- Final registration messages
- CTA button texts
- Inline keyboard configurations

### Step 2: Understand the message flow

**Lawyer registration flow:**
1. `/start` → Welcome message
2. Name input → Specialization selection (inline keyboard)
3. License input → Region selection
4. Confirmation → **Final message** with Mini App button

**Client registration flow:**
1. Clicks invite link → `/start <token>`
2. Name input → Phone/contact share
3. Confirmation → **Final message** with Mini App button

### Step 3: Make changes

When editing messages:

- **Message text:** Change in `config.ts` message templates
- **Inline keyboards:** Update keyboard builder arrays in handler files
- **Specializations:** Add to the enum/list in `config.ts` AND `packages/shared/src/enums.ts` if it's a shared enum
- **Mini App button:** Uses `web_app` type in Grammy:
  ```typescript
  keyboard.webApp("Відкрити Юрбот", miniAppUrl)
  ```
  To make it full-width, use `resized()` and ensure it's the only button in its row.

### Step 4: Button sizing

To make the "Відкрити Юрбот" button full-width on mobile:

```typescript
import { Keyboard } from 'grammy';

// Full-width Mini App button
const keyboard = new Keyboard()
  .webApp("🚀 Відкрити Юрбот", miniAppUrl)
  .resized();  // Makes keyboard fit to content
```

For inline keyboards (inside message):
```typescript
import { InlineKeyboard } from 'grammy';

const keyboard = new InlineKeyboard()
  .webApp("🚀 Відкрити Юрбот", miniAppUrl);
// Inline buttons are always full-width by default
```

**Important:** Grammy's `Keyboard` (reply keyboard) is pinned to the bottom of the screen. `InlineKeyboard` is attached to a specific message. For the "Відкрити Юрбот" CTA, a reply `Keyboard` with `webApp` is usually better — it persists and is always visible.

### Step 5: Removing unwanted buttons/blocks

When removing buttons from final messages:
1. Find the handler that sends the final message (after registration)
2. Remove the unwanted keyboard buttons or message sections
3. **Check callback handlers** — if removed buttons had callbacks, ensure those handlers don't break (they can stay as dead code or be removed)
4. Search for the callback data string across all files to find handlers

### Step 6: Adding emojis/indicators

Use Unicode emoji in message text:
- 👇 — pointing down (before a button)
- 🚀 — rocket (in button text)
- ✅ — success
- 📋 — documents
- ⚖️ — legal/scales

### Step 7: Validate

After changes:

1. **Build the telegram package:**
   ```bash
   npm run build -w packages/telegram
   ```

2. **TypeCheck:**
   ```bash
   npm run typecheck
   ```

3. **Test flow** (if tests exist):
   ```bash
   npx vitest run tests/telegram-flow.test.ts
   ```

4. **Manual verification** — After deploy, test by:
   - Starting a conversation with the bot
   - Going through full registration
   - Checking the final message format
   - Verifying the Mini App button works

## Common pitfalls

- **config.ts consistency:** After multiple edits, this file can become inconsistent. Always read the full file before editing.
- **Enum sync:** If specializations are defined as an enum in `packages/shared/src/enums.ts`, changes must be in BOTH places.
- **Callback data:** Don't change callback data strings without updating ALL handlers that listen for them.
- **Webhook re-registration:** After changing bot handlers, webhooks may need to be re-registered. This happens automatically on backend start.
- **Message length:** Telegram has a 4096 character limit per message. Keep messages concise.

## Checklist for UX changes

- [ ] Read `config.ts` fully before editing
- [ ] Changes are consistent between lawyer and client bots
- [ ] Specialization added to shared enums if needed
- [ ] No orphaned callback handlers
- [ ] `npm run build -w packages/telegram` passes
- [ ] `npm run typecheck` passes
- [ ] Mini App URL is correct (uses env variable, not hardcoded)
