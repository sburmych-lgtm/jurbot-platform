import type { NextFunction, Request, Response } from 'express';
import type { UserPayload } from '@jurbot/shared';
import { verifyAccessToken } from '../utils/jwt.js';
import { AppError } from './errorHandler.js';

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

/**
 * Unified authentication middleware:
 * - JWT Bearer for web sessions
 * - Telegram init data for Mini App calls
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      req.user = verifyAccessToken(token);
      next();
      return;
    } catch {
      throw new AppError(401, 'Недійсний або прострочений токен');
    }
  }

  if (req.headers['x-telegram-init-data']) {
    const { telegramAuth } = await import('./telegramAuth.js');
    await telegramAuth(req, res, next);
    return;
  }

  throw new AppError(401, 'Токен авторизації відсутній');
}
