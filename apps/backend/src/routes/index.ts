import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { healthRouter } from './health.routes.js';
import { usersRouter } from './users.routes.js';
import { casesRouter } from './cases.routes.js';
import { documentsRouter } from './documents.routes.js';
import { templatesRouter } from './templates.routes.js';
import { appointmentsRouter } from './appointments.routes.js';
import { intakeRouter } from './intake.routes.js';
import { timelogsRouter } from './timelogs.routes.js';
import { notificationsRouter } from './notifications.routes.js';
import { telegramRouter } from './telegram.routes.js';
import { tokensRouter } from './tokens.routes.js';
import { subscriptionRouter } from './subscription.routes.js';

export const apiRouter = Router();

// Auth & health
apiRouter.use('/auth', authRouter);
apiRouter.use('/', healthRouter);

// Domain routes
apiRouter.use('/v1/users', usersRouter);
apiRouter.use('/v1/cases', casesRouter);
apiRouter.use('/v1/documents', documentsRouter);
apiRouter.use('/v1/templates', templatesRouter);
apiRouter.use('/v1/appointments', appointmentsRouter);
apiRouter.use('/v1/intake', intakeRouter);
apiRouter.use('/v1/timelogs', timelogsRouter);
apiRouter.use('/v1/notifications', notificationsRouter);
apiRouter.use('/v1/tokens', tokensRouter);
apiRouter.use('/v1/subscription', subscriptionRouter);
apiRouter.use('/telegram', telegramRouter);
