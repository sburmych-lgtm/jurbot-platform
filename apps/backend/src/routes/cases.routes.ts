import { Router } from 'express';
import { createCaseSchema, updateCaseSchema, createMessageSchema } from '@jurbot/shared';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import { parsePagination } from '../utils/pagination.js';
import { param } from '../utils/params.js';
import { AppError } from '../middleware/errorHandler.js';
import * as caseService from '../services/case.service.js';
import * as checklistService from '../services/checklist.service.js';
import * as messageService from '../services/message.service.js';
import { z } from 'zod';

export const casesRouter = Router();

const checklistItemSchema = z.object({ text: z.string().min(1, "Текст обов'язковий") });

// ─── Case CRUD ───

// GET /cases — LAWYER (all), CLIENT (own)
casesRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const result = await caseService.list({
      ...pagination,
      userId: req.user!.id,
      role: req.user!.role,
    });
    res.json({ success: true, data: result.items, meta: result.meta });
  } catch (error) {
    next(error);
  }
});

// POST /cases — LAWYER only
casesRouter.post('/', authenticate, requireRole('LAWYER'), validate(createCaseSchema), async (req, res, next) => {
  try {
    const newCase = await caseService.create(req.body, req.user!.id);
    res.status(201).json({ success: true, data: newCase });
  } catch (error) {
    next(error);
  }
});

// GET /cases/:id — LAWYER or assigned CLIENT
casesRouter.get('/:id', authenticate, async (req, res, next) => {
  try {
    const id = param(req, 'id');
    if (req.user!.role === 'CLIENT') {
      await caseService.verifyClientAccess(id, req.user!.id);
    }
    const caseRecord = await caseService.getById(id);
    res.json({ success: true, data: caseRecord });
  } catch (error) {
    next(error);
  }
});

// PATCH /cases/:id — LAWYER only
casesRouter.patch('/:id', authenticate, requireRole('LAWYER'), validate(updateCaseSchema), async (req, res, next) => {
  try {
    const updated = await caseService.update(param(req, 'id'), req.body);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /cases/:id — LAWYER only (soft delete)
casesRouter.delete('/:id', authenticate, requireRole('LAWYER'), async (req, res, next) => {
  try {
    await caseService.softDelete(param(req, 'id'));
    res.json({ success: true, data: { message: 'Справу видалено' } });
  } catch (error) {
    next(error);
  }
});

// ─── Checklist sub-routes ───

// GET /cases/:id/checklist — LAWYER or assigned CLIENT
casesRouter.get('/:id/checklist', authenticate, async (req, res, next) => {
  try {
    const id = param(req, 'id');
    if (req.user!.role === 'CLIENT') {
      await caseService.verifyClientAccess(id, req.user!.id);
    }
    const items = await checklistService.listByCaseId(id);
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
});

// POST /cases/:id/checklist — LAWYER only
casesRouter.post('/:id/checklist', authenticate, requireRole('LAWYER'), validate(checklistItemSchema), async (req, res, next) => {
  try {
    const id = param(req, 'id');
    await caseService.getById(id);
    const item = await checklistService.create(id, req.body.text);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// PATCH /cases/:id/checklist/:itemId — LAWYER or assigned CLIENT (toggle done)
casesRouter.patch('/:id/checklist/:itemId', authenticate, async (req, res, next) => {
  try {
    const id = param(req, 'id');
    const itemId = param(req, 'itemId');
    if (req.user!.role === 'CLIENT') {
      await caseService.verifyClientAccess(id, req.user!.id);
    }
    const item = await checklistService.toggleDone(itemId);
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// DELETE /cases/:id/checklist/:itemId — LAWYER only
casesRouter.delete('/:id/checklist/:itemId', authenticate, requireRole('LAWYER'), async (req, res, next) => {
  try {
    await checklistService.remove(param(req, 'itemId'));
    res.json({ success: true, data: { message: 'Елемент видалено' } });
  } catch (error) {
    next(error);
  }
});

// ─── Messages sub-routes ───

// GET /cases/:id/messages — LAWYER or assigned CLIENT (paginated)
casesRouter.get('/:id/messages', authenticate, async (req, res, next) => {
  try {
    const id = param(req, 'id');
    if (req.user!.role === 'CLIENT') {
      await caseService.verifyClientAccess(id, req.user!.id);
    }
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const result = await messageService.listByCaseId(id, pagination);
    res.json({ success: true, data: result.items, meta: result.meta });
  } catch (error) {
    next(error);
  }
});

// POST /cases/:id/messages — LAWYER or assigned CLIENT
casesRouter.post('/:id/messages', authenticate, validate(createMessageSchema), async (req, res, next) => {
  try {
    const id = param(req, 'id');
    if (req.user!.role === 'CLIENT') {
      await caseService.verifyClientAccess(id, req.user!.id);
    }
    const message = await messageService.create(id, req.user!.id, req.body.text);
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
});
