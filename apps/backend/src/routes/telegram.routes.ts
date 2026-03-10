import { Router, Request, Response } from 'express';
import { webhookCallback } from 'grammy';
import { getLawyerBot, getClientBot } from '../lib/telegram.js';

export const telegramRouter = Router();

// POST /telegram/lawyer — Grammy webhook for Lawyer bot
telegramRouter.post('/lawyer', (req: Request, res: Response) => {
  const bot = getLawyerBot();
  if (!bot) {
    console.warn('[Telegram] Lawyer bot not initialized, ignoring webhook');
    res.json({ ok: true });
    return;
  }
  webhookCallback(bot, 'express')(req, res);
});

// POST /telegram/client — Grammy webhook for Client bot
telegramRouter.post('/client', (req: Request, res: Response) => {
  const bot = getClientBot();
  if (!bot) {
    console.warn('[Telegram] Client bot not initialized, ignoring webhook');
    res.json({ ok: true });
    return;
  }
  webhookCallback(bot, 'express')(req, res);
});
