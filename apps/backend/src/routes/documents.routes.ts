import { Router } from 'express';
import { createDocumentSchema, updateDocumentSchema, generateDocumentSchema } from '@jurbot/shared';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import { parsePagination } from '../utils/pagination.js';
import { param } from '../utils/params.js';
import * as documentService from '../services/document.service.js';
import { TEMPLATES } from '@jurbot/shared';

export const documentsRouter = Router();

// GET /documents/templates — return available document templates
documentsRouter.get('/templates', authenticate, requireRole('LAWYER'), (_req, res) => {
  res.json({ success: true, data: TEMPLATES });
});

// GET /documents — LAWYER (own case docs), CLIENT (own case docs)
documentsRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const result = await documentService.list({
      ...pagination,
      userId: req.user!.id,
      role: req.user!.role,
    });
    res.json({ success: true, data: result.items, meta: result.meta });
  } catch (error) {
    next(error);
  }
});

// POST /documents — LAWYER only (own case)
documentsRouter.post('/', authenticate, requireRole('LAWYER'), validate(createDocumentSchema), async (req, res, next) => {
  try {
    const doc = await documentService.create(req.body, req.user!.id);
    res.status(201).json({ success: true, data: doc });
  } catch (error) {
    next(error);
  }
});

// POST /documents/generate — LAWYER only (own case, from template)
documentsRouter.post('/generate', authenticate, requireRole('LAWYER'), validate(generateDocumentSchema), async (req, res, next) => {
  try {
    const doc = await documentService.generate(req.body, req.user!.id);
    res.status(201).json({ success: true, data: doc });
  } catch (error) {
    next(error);
  }
});

// GET /documents/:id — LAWYER (own) or assigned CLIENT
documentsRouter.get('/:id', authenticate, async (req, res, next) => {
  try {
    const id = param(req, 'id');
    if (req.user!.role === 'CLIENT') {
      await documentService.verifyClientAccess(id, req.user!.id);
    }
    const doc = await documentService.getById(id, req.user!.id, req.user!.role);
    res.json({ success: true, data: doc });
  } catch (error) {
    next(error);
  }
});

// PATCH /documents/:id — LAWYER only (own)
documentsRouter.patch('/:id', authenticate, requireRole('LAWYER'), validate(updateDocumentSchema), async (req, res, next) => {
  try {
    const doc = await documentService.update(param(req, 'id'), req.body, req.user!.id);
    res.json({ success: true, data: doc });
  } catch (error) {
    next(error);
  }
});

// DELETE /documents/:id — LAWYER only (own, soft delete)
documentsRouter.delete('/:id', authenticate, requireRole('LAWYER'), async (req, res, next) => {
  try {
    await documentService.softDelete(param(req, 'id'), req.user!.id);
    res.json({ success: true, data: { message: 'Документ видалено' } });
  } catch (error) {
    next(error);
  }
});
