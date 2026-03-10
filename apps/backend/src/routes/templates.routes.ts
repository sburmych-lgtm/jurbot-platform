import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { param } from '../utils/params.js';
import * as templateService from '../services/template.service.js';

export const templatesRouter = Router();

// GET /templates — LAWYER only (list templates)
templatesRouter.get('/', authenticate, requireRole('LAWYER'), async (_req, res, next) => {
  try {
    const templates = templateService.list();
    res.json({ success: true, data: templates });
  } catch (error) {
    next(error);
  }
});

// GET /templates/:id — LAWYER only (get template detail)
templatesRouter.get('/:id', authenticate, requireRole('LAWYER'), async (req, res, next) => {
  try {
    const template = templateService.getById(param(req, 'id'));
    res.json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
});
