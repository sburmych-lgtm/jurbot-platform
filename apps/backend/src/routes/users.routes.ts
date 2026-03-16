import { Router } from 'express';
import { prisma } from '@jurbot/db';
import { updateUserSchema } from '@jurbot/shared';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import { parsePagination } from '../utils/pagination.js';
import { param } from '../utils/params.js';
import { AppError } from '../middleware/errorHandler.js';
import * as userService from '../services/user.service.js';

export const usersRouter = Router();

// GET /users — LAWYER only, scoped to lawyer's organization
usersRouter.get('/', authenticate, requireRole('LAWYER'), async (req, res, next) => {
  try {
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const role = typeof req.query.role === 'string' ? req.query.role : undefined;

    // SECURITY: resolve lawyer's orgId to scope client list
    let orgId: string | undefined;
    if (role === 'CLIENT') {
      const lawyerProfile = await prisma.lawyerProfile.findUnique({
        where: { userId: req.user!.id },
        select: { orgId: true },
      });
      orgId = lawyerProfile?.orgId ?? undefined;
    }

    const result = await userService.list({ ...pagination, role, orgId });
    res.json({ success: true, data: result.items, meta: result.meta });
  } catch (error) {
    next(error);
  }
});

// GET /users/:id — LAWYER (same org) or own CLIENT
usersRouter.get('/:id', authenticate, async (req, res, next) => {
  try {
    const id = param(req, 'id');
    if (req.user!.role === 'CLIENT' && req.user!.id !== id) {
      throw new AppError(403, 'Недостатньо прав доступу');
    }
    if (req.user!.role === 'LAWYER' && req.user!.id !== id) {
      // Verify target user is in the same org
      const lawyerProfile = await prisma.lawyerProfile.findUnique({
        where: { userId: req.user!.id },
        select: { orgId: true },
      });
      if (lawyerProfile?.orgId) {
        const targetUser = await prisma.user.findUnique({
          where: { id },
          include: { lawyerProfile: { select: { orgId: true } }, clientProfile: { select: { orgId: true } } },
        });
        const targetOrgId = targetUser?.lawyerProfile?.orgId ?? targetUser?.clientProfile?.orgId;
        if (targetOrgId && targetOrgId !== lawyerProfile.orgId) {
          throw new AppError(403, 'Недостатньо прав доступу');
        }
      }
    }
    const user = await userService.getById(id);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// PATCH /users/:id — own user only
usersRouter.patch('/:id', authenticate, validate(updateUserSchema), async (req, res, next) => {
  try {
    const id = param(req, 'id');
    if (req.user!.id !== id) {
      throw new AppError(403, 'Можна редагувати лише власний профіль');
    }
    const user = await userService.update(id, req.body);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// DELETE /users/:id — LAWYER only (soft delete)
usersRouter.delete('/:id', authenticate, requireRole('LAWYER'), async (req, res, next) => {
  try {
    await userService.softDelete(param(req, 'id'));
    res.json({ success: true, data: { message: 'Користувача деактивовано' } });
  } catch (error) {
    next(error);
  }
});
