import { Router, Request, Response } from 'express';
import { webhookCallback } from 'grammy';
import { getLawyerBot, getClientBot } from '../lib/telegram.js';

export const telegramRouter = Router();

// POST /telegram/lawyer — Grammy webhook for Lawyer bot
telegramRouter.post('/lawyer', async (req: Request, res: Response) => {
  const bot = getLawyerBot();
  if (!bot) {
    console.warn('[Telegram] Lawyer bot not initialized, ignoring webhook');
    res.json({ ok: true });
    return;
  }
  try {
    await webhookCallback(bot, 'express')(req, res);
  } catch (err) {
    console.error('[Telegram] Lawyer bot webhook error:', err);
    if (!res.headersSent) res.json({ ok: true });
  }
});

// POST /telegram/client — Grammy webhook for Client bot
telegramRouter.post('/client', async (req: Request, res: Response) => {
  const bot = getClientBot();
  if (!bot) {
    console.warn('[Telegram] Client bot not initialized, ignoring webhook');
    res.json({ ok: true });
    return;
  }
  try {
    await webhookCallback(bot, 'express')(req, res);
  } catch (err) {
    console.error('[Telegram] Client bot webhook error:', err);
    if (!res.headersSent) res.json({ ok: true });
  }
});
