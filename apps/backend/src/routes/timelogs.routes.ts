import { Router } from 'express';
import { createTimeLogSchema, updateTimeLogSchema } from '@jurbot/shared';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import { parsePagination } from '../utils/pagination.js';
import { param } from '../utils/params.js';
import * as timelogService from '../services/timelog.service.js';

export const timelogsRouter = Router();

// GET /timelogs — LAWYER only (filterable by case)
timelogsRouter.get('/', authenticate, requireRole('LAWYER'), async (req, res, next) => {
  try {
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const caseId = typeof req.query.caseId === 'string' ? req.query.caseId : undefined;
    const result = await timelogService.list({
      ...pagination,
      caseId,
      lawyerUserId: req.user!.id,
    });
    res.json({ success: true, data: result.items, meta: result.meta });
  } catch (error) {
    next(error);
  }
});

// POST /timelogs — LAWYER only
timelogsRouter.post('/', authenticate, requireRole('LAWYER'), validate(createTimeLogSchema), async (req, res, next) => {
  try {
    const entry = await timelogService.create(req.body, req.user!.id);
    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
});

// PATCH /timelogs/:id — LAWYER only
timelogsRouter.patch('/:id', authenticate, requireRole('LAWYER'), validate(updateTimeLogSchema), async (req, res, next) => {
  try {
    const entry = await timelogService.update(param(req, 'id'), req.body);
    res.json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
});

// DELETE /timelogs/:id — LAWYER only
timelogsRouter.delete('/:id', authenticate, requireRole('LAWYER'), async (req, res, next) => {
  try {
    await timelogService.remove(param(req, 'id'));
    res.json({ success: true, data: { message: 'Запис часу видалено' } });
  } catch (error) {
    next(error);
  }
});
