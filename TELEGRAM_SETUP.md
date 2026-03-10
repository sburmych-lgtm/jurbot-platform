# Telegram Bot Setup Guide

## Overview

ЮрБот uses a **two-bot architecture**:

- **Lawyer Bot** — case updates, schedule management, document alerts, quick replies
- **Client Bot** — appointment booking, case status, document upload, FAQ

Both bots share the same backend. Webhook endpoints are already configured:
- Lawyer: `POST /api/telegram/lawyer`
- Client: `POST /api/telegram/client`

## Step 1: Create Bots via BotFather

1. Open [@BotFather](https://t.me/BotFather) in Telegram
2. Send `/newbot` to create the **Lawyer Bot**:
   - Name: `ЮрБот Адвокат` (or your preferred name)
   - Username: e.g., `@YourLawyerJurBot`
   - Save the token: `TELEGRAM_BOT_TOKEN_LAWYER`
3. Send `/newbot` again for the **Client Bot**:
   - Name: `ЮрБот Клієнт`
   - Username: e.g., `@YourClientJurBot`
   - Save the token: `TELEGRAM_BOT_TOKEN_CLIENT`
4. Optional: set descriptions and profile photos via `/setdescription` and `/setuserpic`

## Step 2: Configure Environment Variables

Update your `.env` (local) or Railway dashboard (production):

```env
TELEGRAM_BOT_TOKEN_LAWYER=123456:ABC-your-lawyer-bot-token
TELEGRAM_BOT_TOKEN_CLIENT=789012:DEF-your-client-bot-token
TELEGRAM_WEBHOOK_SECRET=generate-a-random-string-here
TELEGRAM_WEBHOOK_URL=https://your-backend.railway.app
```

Generate a secure webhook secret:
```bash
openssl rand -hex 32
```

## Step 3: Set Webhooks

After deploying the backend, register webhook URLs with Telegram:

**Lawyer Bot:**
```bash
curl -X POST "https://api.telegram.org/bot<LAWYER_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-backend.railway.app/api/telegram/lawyer",
    "secret_token": "your-webhook-secret"
  }'
```

**Client Bot:**
```bash
curl -X POST "https://api.telegram.org/bot<CLIENT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-backend.railway.app/api/telegram/client",
    "secret_token": "your-webhook-secret"
  }'
```

Expected response:
```json
{ "ok": true, "result": true, "description": "Webhook was set" }
```

## Step 4: Verify Webhooks

```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

Check that:
- `url` matches your endpoint
- `has_custom_certificate` is `false`
- `pending_update_count` is `0` (or low)
- No errors in `last_error_message`

## Bot Features (Planned)

### Lawyer Bot
| Command | Description |
|---------|-------------|
| `/start` | Welcome + account linking |
| `/cases` | List active cases |
| `/today` | Today's schedule |
| `/notifications` | Unread notifications |

### Client Bot
| Command | Description |
|---------|-------------|
| `/start` | Welcome + account linking |
| `/status` | Case status check |
| `/book` | Book appointment |
| `/documents` | View documents |
| `/faq` | Frequently asked questions |

## Account Linking Flow

1. User sends `/start` to the bot
2. Bot generates a 6-digit linking code
3. User enters the code in the ЮрБот web app (Profile → Telegram)
4. Backend matches Telegram ID to the user account
5. Future messages are routed to the correct user

The linking is stored in the `TelegramIdentity` model:
```
telegramId  → Telegram user ID
chatId      → Telegram chat ID
userId      → ЮрБот user ID
botType     → LAWYER | CLIENT
```

## Troubleshooting

**Webhook not receiving updates**: Ensure the backend is publicly accessible (HTTPS required). Check `getWebhookInfo` for errors.

**401 Unauthorized on webhook**: Verify `TELEGRAM_WEBHOOK_SECRET` matches between your env and the `secret_token` sent to Telegram.

**Bot not responding**: Check Railway logs for the backend service. Ensure Grammy handlers are registered in `packages/telegram/`.

**Account linking fails**: Verify the linking code hasn't expired (5-minute TTL) and the user exists in the database.
