import { Router } from 'express';

export const telegramRouter = Router();

// POST /telegram/lawyer — Telegram webhook (placeholder)
telegramRouter.post('/lawyer', async (req, res, _next) => {
  // TODO: Integrate Grammy bot webhook handler
  console.log('[Telegram] Lawyer bot webhook received');
  res.json({ ok: true });
});

// POST /telegram/client — Telegram webhook (placeholder)
telegramRouter.post('/client', async (req, res, _next) => {
  // TODO: Integrate Grammy bot webhook handler
  console.log('[Telegram] Client bot webhook received');
  res.json({ ok: true });
});
