import { Router } from 'express';
import { z } from 'zod';
import {
  createAppointmentSchema,
  updateAppointmentSchema,
} from '@jurbot/shared';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import { parsePagination } from '../utils/pagination.js';
import { param } from '../utils/params.js';
import * as appointmentService from '../services/appointment.service.js';

export const appointmentsRouter = Router();

const availabilityUpdateSchema = z.object({
  date: z.string().min(1),
  slots: z.array(z.string()),
});

// GET /appointments/availability — slots for selected day and current lawyer context
appointmentsRouter.get('/availability', authenticate, async (req, res, next) => {
  try {
    const date =
      typeof req.query.date === 'string'
        ? req.query.date
        : new Date().toISOString();
    const lawyerId =
      typeof req.query.lawyerId === 'string' ? req.query.lawyerId : undefined;

    const availability = await appointmentService.getAvailability(date, {
      userId: req.user!.id,
      role: req.user!.role,
      lawyerId,
    });

    res.json({ success: true, data: availability });
  } catch (error) {
    next(error);
  }
});

// PUT /appointments/availability — LAWYER updates available slots for date
appointmentsRouter.put(
  '/availability',
  authenticate,
  requireRole('LAWYER'),
  async (req, res, next) => {
    try {
      const payload = availabilityUpdateSchema.parse(req.body);
      const availability = await appointmentService.setAvailability(
        payload.date,
        payload.slots,
        req.user!.id,
      );

      res.json({ success: true, data: availability });
    } catch (error) {
      next(error);
    }
  },
);

// GET /appointments/slots — legacy endpoint with ISO slot list
appointmentsRouter.get('/slots', authenticate, async (req, res, next) => {
  try {
    const date =
      typeof req.query.date === 'string'
        ? req.query.date
        : new Date().toISOString();
    const lawyerId =
      typeof req.query.lawyerId === 'string' ? req.query.lawyerId : undefined;

    const slots = await appointmentService.getAvailableSlots(date, {
      userId: req.user!.id,
      role: req.user!.role,
      lawyerId,
    });

    res.json({ success: true, data: slots });
  } catch (error) {
    next(error);
  }
});

// GET /appointments — LAWYER (own), CLIENT (own)
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
appointmentsRouter.post(
  '/',
  authenticate,
  validate(createAppointmentSchema),
  async (req, res, next) => {
    try {
      const appointment = await appointmentService.create(
        req.body,
        req.user!.id,
        req.user!.role,
      );

      res.status(201).json({ success: true, data: appointment });
    } catch (error) {
      next(error);
    }
  },
);

// GET /appointments/:id — LAWYER or own CLIENT
appointmentsRouter.get('/:id', authenticate, async (req, res, next) => {
  try {
    const id = param(req, 'id');
    if (req.user!.role === 'CLIENT') {
      await appointmentService.verifyClientAccess(id, req.user!.id);
    }
    const appointment = await appointmentService.getById(id, req.user!.id, req.user!.role);
    res.json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
});

// PATCH /appointments/:id — LAWYER only
appointmentsRouter.patch(
  '/:id',
  authenticate,
  requireRole('LAWYER'),
  validate(updateAppointmentSchema),
  async (req, res, next) => {
    try {
      const appointment = await appointmentService.update(param(req, 'id'), req.body, req.user!.id);
      res.json({ success: true, data: appointment });
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /appointments/:id — LAWYER or own CLIENT (cancel)
appointmentsRouter.delete(
  '/:id',
  authenticate,
  async (req, res, next) => {
    try {
      await appointmentService.remove(param(req, 'id'), req.user!.id, req.user!.role);
      res.json({ success: true, data: { message: 'Запис скасовано' } });
    } catch (error) {
      next(error);
    }
  },
);
