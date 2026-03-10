import { Router } from 'express';
import { createAppointmentSchema, updateAppointmentSchema } from '@jurbot/shared';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import { parsePagination } from '../utils/pagination.js';
import { param } from '../utils/params.js';
import * as appointmentService from '../services/appointment.service.js';

export const appointmentsRouter = Router();

// GET /appointments/slots — Available time slots for a date
appointmentsRouter.get('/slots', authenticate, async (req, res, next) => {
  try {
    const date = typeof req.query.date === 'string' ? req.query.date : new Date().toISOString();
    const lawyerId = typeof req.query.lawyerId === 'string' ? req.query.lawyerId : undefined;
    const slots = await appointmentService.getAvailableSlots(date, lawyerId);
    res.json({ success: true, data: slots });
  } catch (error) {
    next(error);
  }
});

// GET /appointments — LAWYER (all), CLIENT (own)
appointmentsRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const result = await appointmentService.list({
      ...pagination,
      userId: req.user!.id,
      role: req.user!.role,
    });
    res.json({ success: true, data: result.items, meta: result.meta });
  } catch (error) {
    next(error);
  }
});

// POST /appointments — LAWYER or CLIENT
appointmentsRouter.post('/', authenticate, validate(createAppointmentSchema), async (req, res, next) => {
  try {
    const appointment = await appointmentService.create(req.body, req.user!.id, req.user!.role);
    res.status(201).json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
});

// GET /appointments/:id — LAWYER or own CLIENT
appointmentsRouter.get('/:id', authenticate, async (req, res, next) => {
  try {
    const id = param(req, 'id');
    if (req.user!.role === 'CLIENT') {
      await appointmentService.verifyClientAccess(id, req.user!.id);
    }
    const appointment = await appointmentService.getById(id);
    res.json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
});

// PATCH /appointments/:id — LAWYER only
appointmentsRouter.patch('/:id', authenticate, requireRole('LAWYER'), validate(updateAppointmentSchema), async (req, res, next) => {
  try {
    const appointment = await appointmentService.update(param(req, 'id'), req.body);
    res.json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
});

// DELETE /appointments/:id — LAWYER only (cancel)
appointmentsRouter.delete('/:id', authenticate, requireRole('LAWYER'), async (req, res, next) => {
  try {
    await appointmentService.remove(param(req, 'id'));
    res.json({ success: true, data: { message: 'Запис скасовано' } });
  } catch (error) {
    next(error);
  }
});
