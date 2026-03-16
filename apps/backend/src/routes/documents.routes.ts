import { Router } from 'express';
import multer from 'multer';
import { createDocumentSchema, updateDocumentSchema, generateDocumentSchema } from '@jurbot/shared';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import { parsePagination } from '../utils/pagination.js';
import { param } from '../utils/params.js';
import * as documentService from '../services/document.service.js';
import { TEMPLATES } from '@jurbot/shared';
import { config } from '../config.js';
import { AppError } from '../middleware/errorHandler.js';

export const documentsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxFileSize },
});

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

// GET /documents/:id/download — LAWYER (own) or assigned CLIENT
documentsRouter.get('/:id/download', authenticate, async (req, res, next) => {
  try {
    const id = param(req, 'id');
    if (req.user!.role === 'CLIENT') {
      await documentService.verifyClientAccess(id, req.user!.id);
    }

    const payload = await documentService.getDownloadPayload(id, req.user!.id, req.user!.role);
    res.setHeader('Content-Type', payload.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(payload.fileName)}"`);
    res.send(payload.content);
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

// POST /documents/upload — CLIENT uploads a file to their active case
documentsRouter.post('/upload', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError(400, 'Файл не передано');
    }

    const doc = await documentService.clientUpload({
      originalName: req.file.originalname,
      mimeType: req.file.mimetype || 'application/octet-stream',
      sizeBytes: req.file.size,
      buffer: req.file.buffer,
    }, req.user!.id);
    res.status(201).json({ success: true, data: doc });
  } catch (error) {
    next(error);
  }
});

// POST /documents/upload/lawyer — LAWYER uploads a ready-made file into selected case
documentsRouter.post('/upload/lawyer', authenticate, requireRole('LAWYER'), upload.single('file'), async (req, res, next) => {
  try {
    const caseId = typeof req.body?.caseId === 'string' ? req.body.caseId : '';
    if (!caseId) {
      throw new AppError(400, 'caseId обовʼязковий');
    }
    if (!req.file) {
      throw new AppError(400, 'Файл не передано');
    }

    const doc = await documentService.lawyerUploadToCase({
      originalName: req.file.originalname,
      mimeType: req.file.mimetype || 'application/octet-stream',
      sizeBytes: req.file.size,
      buffer: req.file.buffer,
    }, caseId, req.user!.id);

    res.status(201).json({ success: true, data: doc });
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
