import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { flexAuth } from '../middleware/telegramAuth.js';
import { requireRole } from '../middleware/role.js';
import { param } from '../utils/params.js';
import * as tokenService from '../services/token.service.js';

export const tokensRouter = Router();

// GET /tokens — LAWYER only (list active invite tokens)
tokensRouter.get('/', flexAuth, requireRole('LAWYER'), async (req, res, next) => {
  try {
    const lawyerProfile = await import('@jurbot/db').then(({ prisma }) =>
      prisma.lawyerProfile.findUnique({ where: { userId: req.user!.id } }),
    );
    if (!lawyerProfile) {
      res.status(404).json({ success: false, error: 'Профіль адвоката не знайдено' });
      return;
    }
    const tokens = await tokenService.getTokensByLawyer(lawyerProfile.id);
    res.json({ success: true, data: tokens });
  } catch (error) {
    next(error);
  }
});

// POST /tokens — LAWYER only (create new invite token)
tokensRouter.post('/', flexAuth, requireRole('LAWYER'), async (req, res, next) => {
  try {
    const { prisma } = await import('@jurbot/db');
    const lawyerProfile = await prisma.lawyerProfile.findUnique({
      where: { userId: req.user!.id },
    });
    if (!lawyerProfile?.orgId) {
      res.status(404).json({ success: false, error: 'Організацію не знайдено' });
      return;
    }

    const { tokenType = 'PUBLIC_LAWYER', caseId, maxUses, expiresInDays = 365 } = req.body;

    const token = await tokenService.createInviteToken({
      orgId: lawyerProfile.orgId,
      lawyerId: lawyerProfile.id,
      tokenType,
      caseId,
      maxUses,
      expiresInDays,
    });

    res.status(201).json({ success: true, data: token });
  } catch (error) {
    next(error);
  }
});

// GET /tokens/resolve/:token — PUBLIC (resolve token to org info)
tokensRouter.get('/resolve/:token', async (req, res, next) => {
  try {
    const record = await tokenService.resolveToken(param(req, 'token'));
    if (!record) {
      res.status(404).json({ success: false, error: 'Токен недійсний або протермінований' });
      return;
    }
    res.json({
      success: true,
      data: {
        orgName: record.org.name,
        lawyerName: record.lawyer?.user?.name ?? null,
        tokenType: record.tokenType,
      },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /tokens/:id — LAWYER only (deactivate own token)
tokensRouter.delete('/:id', flexAuth, requireRole('LAWYER'), async (req, res, next) => {
  try {
    const { prisma } = await import('@jurbot/db');
    const lawyerProfile = await prisma.lawyerProfile.findUnique({
      where: { userId: req.user!.id },
    });
    if (!lawyerProfile) {
      res.status(404).json({ success: false, error: 'Профіль адвоката не знайдено' });
      return;
    }
    await tokenService.deactivateToken(param(req, 'id'), lawyerProfile.id);
    res.json({ success: true, data: { deactivated: true } });
  } catch (error) {
    next(error);
  }
});
