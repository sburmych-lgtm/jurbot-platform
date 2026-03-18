import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { parsePagination } from '../utils/pagination.js';
import { param } from '../utils/params.js';
import * as notificationService from '../services/notification.service.js';

export const notificationsRouter = Router();

// GET /notifications/unread-count — B-050: unread badge count
notificationsRouter.get('/unread-count', authenticate, async (req, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(req.user!.id);
    res.json({ success: true, data: { count } });
  } catch (error) {
    next(error);
  }
});

// GET /notifications — Both roles (own notifications)
notificationsRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const result = await notificationService.list({
      ...pagination,
      userId: req.user!.id,
    });
    res.json({ success: true, data: result.items, meta: result.meta });
  } catch (error) {
    next(error);
  }
});

// PATCH /notifications/:id/read — own user
notificationsRouter.patch('/:id/read', authenticate, async (req, res, next) => {
  try {
    const notification = await notificationService.markAsRead(param(req, 'id'), req.user!.id);
    res.json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
});

// POST /notifications/read-all — own user
notificationsRouter.post('/read-all', authenticate, async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user!.id);
    res.json({ success: true, data: { message: 'Усі сповіщення прочитано' } });
  } catch (error) {
    next(error);
  }
});
