import { Bot } from 'grammy';
import { createLawyerBot, createClientBot, isPlaceholderToken } from '@jurbot/telegram';
import { config } from '../config.js';

let lawyerBot: Bot | null = null;
let clientBot: Bot | null = null;

export function initBots(): { lawyerBot: Bot | null; clientBot: Bot | null } {
  const miniAppUrl = config.miniAppUrl || undefined;

  if (!isPlaceholderToken(config.telegramLawyerToken)) {
    lawyerBot = createLawyerBot(config.telegramLawyerToken, miniAppUrl);
    console.log('[Telegram] Lawyer bot initialized');
  } else {
    console.warn('[Telegram] Lawyer bot token is placeholder — skipping init');
  }

  if (!isPlaceholderToken(config.telegramClientToken)) {
    clientBot = createClientBot(config.telegramClientToken, miniAppUrl);
    console.log('[Telegram] Client bot initialized');
  } else {
    console.warn('[Telegram] Client bot token is placeholder — skipping init');
  }

  return { lawyerBot, clientBot };
}

export function getLawyerBot(): Bot | null {
  return lawyerBot;
}

export function getClientBot(): Bot | null {
  return clientBot;
}

export async function registerWebhooks(): Promise<void> {
  const baseUrl = config.telegramWebhookUrl;

  if (!baseUrl) {
    console.warn('[Telegram] TELEGRAM_WEBHOOK_URL not set — skipping webhook registration');
    return;
  }

  const secret = config.telegramWebhookSecret;

  if (lawyerBot) {
    try {
      const url = `${baseUrl}/api/telegram/lawyer`;
      await lawyerBot.api.setWebhook(url, { secret_token: secret });
      console.log(`[Telegram] Lawyer bot webhook registered: ${url}`);
    } catch (err) {
      console.error('[Telegram] Failed to register lawyer bot webhook:', err);
    }
  }

  if (clientBot) {
    try {
      const url = `${baseUrl}/api/telegram/client`;
      await clientBot.api.setWebhook(url, { secret_token: secret });
      console.log(`[Telegram] Client bot webhook registered: ${url}`);
    } catch (err) {
      console.error('[Telegram] Failed to register client bot webhook:', err);
    }
  }
}
