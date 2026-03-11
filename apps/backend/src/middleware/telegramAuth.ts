import { createHmac } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@jurbot/db';
import { config } from '../config.js';
import { AppError } from './errorHandler.js';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

interface TelegramInitData {
  user: TelegramUser;
  auth_date: number;
  hash: string;
  query_id?: string;
  chat_instance?: string;
  start_param?: string;
}

/**
 * Validate Telegram initData using HMAC-SHA256.
 * Per Telegram docs: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function validateInitData(initDataStr: string, botToken: string): TelegramInitData | null {
  const params = new URLSearchParams(initDataStr);
  const hash = params.get('hash');
  if (!hash) return null;

  // Remove hash and sort remaining params alphabetically
  params.delete('hash');
  const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

  // HMAC-SHA256: secret = HMAC_SHA256("WebAppData", bot_token)
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computed = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (computed !== hash) return null;

  // Auth date must be within 24h
  const authDate = parseInt(params.get('auth_date') ?? '0', 10);
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > 86400) return null;

  const userStr = params.get('user');
  if (!userStr) return null;

  try {
    const user = JSON.parse(userStr) as TelegramUser;
    return {
      user,
      auth_date: authDate,
      hash,
      query_id: params.get('query_id') ?? undefined,
      chat_instance: params.get('chat_instance') ?? undefined,
      start_param: params.get('start_param') ?? undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Check if a telegramId is the configured superadmin.
 */
function isSuperadmin(telegramId: bigint): boolean {
  return config.superadminTelegramId !== null && telegramId === config.superadminTelegramId;
}

/**
 * Middleware: validate Telegram initData from X-Telegram-Init-Data header.
 * Finds user by telegramId and attaches to req.user.
 * Superadmin gets elevated access with isSuperadmin flag.
 */
export async function telegramAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const initDataStr = req.headers['x-telegram-init-data'] as string | undefined;

  if (!initDataStr) {
    next();
    return;
  }

  // Try lawyer bot token first, then client bot token
  let parsed = validateInitData(initDataStr, config.telegramLawyerToken);
  if (!parsed) {
    parsed = validateInitData(initDataStr, config.telegramClientToken);
  }

  if (!parsed) {
    throw new AppError(401, 'Недійсні дані Telegram авторизації');
  }

  const telegramId = BigInt(parsed.user.id);
  const superadmin = isSuperadmin(telegramId);

  // Find user by top-level telegramId field (fast lookup)
  let user = await prisma.user.findUnique({
    where: { telegramId },
    select: { id: true, email: true, role: true, name: true },
  });

  // Fallback: find via TelegramIdentity join
  if (!user) {
    const identity = await prisma.telegramIdentity.findUnique({
      where: { telegramId },
      include: { user: { select: { id: true, email: true, role: true, name: true } } },
    });
    if (identity) {
      user = identity.user;
    }
  }

  if (!user) {
    throw new AppError(401, 'Користувач не знайдений. Пройдіть реєстрацію через бота.');
  }

  req.user = {
    id: user.id,
    email: user.email ?? '',
    role: user.role,
    name: user.name,
    isSuperadmin: superadmin,
  };

  next();
}

/**
 * Middleware: accept either Telegram initData OR JWT Bearer token.
 * Use on routes that serve both Mini App and API clients.
 */
export async function flexAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.headers['x-telegram-init-data']) {
    return telegramAuth(req, res, next);
  }

  // Fall back to JWT
  const { authenticate } = await import('./auth.js');
  authenticate(req, res, next);
}
