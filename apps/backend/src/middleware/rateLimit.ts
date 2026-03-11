import rateLimit from 'express-rate-limit';

/** Global API rate limit: 100 req/min per IP */
export const globalLimiter = rateLimit({
  windowMs: 60_000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: '\u0417\u0430\u043d\u0430\u0434\u0442\u043e \u0431\u0430\u0433\u0430\u0442\u043e \u0437\u0430\u043f\u0438\u0442\u0456\u0432. \u0421\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u043f\u0456\u0437\u043d\u0456\u0448\u0435.' },
});

/** Strict limiter for auth endpoints: 10 req/15min per IP */
export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: '\u0417\u0430\u043d\u0430\u0434\u0442\u043e \u0431\u0430\u0433\u0430\u0442\u043e \u0441\u043f\u0440\u043e\u0431 \u0432\u0445\u043e\u0434\u0443. \u0417\u0430\u0447\u0435\u043a\u0430\u0439\u0442\u0435 15 \u0445\u0432\u0438\u043b\u0438\u043d.' },
});

/** Intake submission limiter: 5 req/hour per IP */
export const intakeLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: '\u0417\u0430\u043d\u0430\u0434\u0442\u043e \u0431\u0430\u0433\u0430\u0442\u043e \u0437\u0430\u044f\u0432\u043e\u043a. \u0421\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u043f\u0456\u0437\u043d\u0456\u0448\u0435.' },
});
