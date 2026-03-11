import { Router } from 'express';
import { flexAuth } from '../middleware/telegramAuth.js';
import { requireRole } from '../middleware/role.js';
import { prisma } from '@jurbot/db';
import * as subService from '../services/subscription.service.js';

export const subscriptionRouter = Router();

// GET /subscription — LAWYER only (get current subscription + usage)
subscriptionRouter.get('/', flexAuth, requireRole('LAWYER'), async (req, res, next) => {
  try {
    const profile = await prisma.lawyerProfile.findUnique({
      where: { userId: req.user!.id },
    });
    if (!profile?.orgId) {
      res.status(404).json({ success: false, error: 'Організацію не знайдено' });
      return;
    }

    const subscription = await subService.getSubscription(profile.orgId);
    const usage = await subService.getOrCreateUsageCounter(profile.orgId);
    const limits = subscription ? subService.getPlanLimits(subscription.plan) : null;

    res.json({
      success: true,
      data: { subscription, usage, limits },
    });
  } catch (error) {
    next(error);
  }
});
