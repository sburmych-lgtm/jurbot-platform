import { Router } from 'express';
import { intakeSubmissionSchema } from '@jurbot/shared';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import { parsePagination } from '../utils/pagination.js';
import { param } from '../utils/params.js';
import * as intakeService from '../services/intake.service.js';
import { intakeLimiter } from '../middleware/rateLimit.js';

export const intakeRouter = Router();


// POST /intake — PUBLIC (submit intake form)
intakeRouter.post('/', intakeLimiter, validate(intakeSubmissionSchema), async (req, res, next) => {
  try {
    const result = await intakeService.submit(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /intake — LAWYER only (list submissions)
intakeRouter.get('/', authenticate, requireRole('LAWYER'), async (req, res, next) => {
  try {
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const result = await intakeService.list(pagination, req.user!.id);
    res.json({ success: true, data: result.items, meta: result.meta });
  } catch (error) {
    next(error);
  }
});

// GET /intake/:id — LAWYER only
intakeRouter.get('/:id', authenticate, requireRole('LAWYER'), async (req, res, next) => {
  try {
    const submission = await intakeService.getById(param(req, 'id'), req.user!.id);
    res.json({ success: true, data: submission });
  } catch (error) {
    next(error);
  }
});

// POST /intake/:id/convert — LAWYER only (convert to case)
intakeRouter.post('/:id/convert', authenticate, requireRole('LAWYER'), async (req, res, next) => {
  try {
    const newCase = await intakeService.convertToCase(param(req, 'id'), req.user!.id);
    res.status(201).json({ success: true, data: newCase });
  } catch (error) {
    next(error);
  }
});
