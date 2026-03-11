import type { Request, Response, NextFunction } from 'express';
import { checkLimit, checkTrialExpiry } from '../services/subscription.service.js';
import { prisma } from '@jurbot/db';
import { AppError } from './errorHandler.js';

/**
 * Resolve orgId from the authenticated user.
 * Checks LawyerProfile or ClientProfile for orgId.
 */
async function resolveOrgId(userId: string): Promise<string | null> {
  const lawyer = await prisma.lawyerProfile.findUnique({
    where: { userId },
    select: { orgId: true },
  });
  if (lawyer?.orgId) return lawyer.orgId;

  const client = await prisma.clientProfile.findUnique({
    where: { userId },
    select: { orgId: true },
  });
  return client?.orgId ?? null;
}

/**
 * Middleware factory: check subscription is active before allowing action.
 */
export function requireActiveSubscription() {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) throw new AppError(401, 'Авторизація необхідна');

    const orgId = await resolveOrgId(req.user.id);
    if (!orgId) throw new AppError(403, 'Організація не знайдена');

    const expired = await checkTrialExpiry(orgId);
    if (expired) {
      throw new AppError(403, 'Підписка закінчилась. Оновіть план для продовження роботи.');
    }

    next();
  };
}

/**
 * Middleware factory: check a specific limit before allowing create action.
 */
export function requireLimit(limitType: 'clients' | 'cases' | 'aiDocs') {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) throw new AppError(401, 'Авторизація необхідна');

    const orgId = await resolveOrgId(req.user.id);
    if (!orgId) throw new AppError(403, 'Організація не знайдена');

    const result = await checkLimit(orgId, limitType);
    if (!result.allowed) {
      throw new AppError(403, `Ліміт вичерпано: ${limitType} (${result.current}/${result.max}). Оновіть план.`);
    }

    next();
  };
}
