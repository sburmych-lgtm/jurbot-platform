import rateLimit from 'express-rate-limit';

/** Global API rate limit: 100 req/min per IP */
export const globalLimiter = rateLimit({
  windowMs: 60_000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'Занадто багато запитів. Спробуйте пізніше.' },
});

/** Strict limiter for auth endpoints: 10 req/15min per IP */
export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'Занадто багато спроб входу. Зачекайте 15 хвилин.' },
});

/** Intake submission limiter: 5 req/hour per IP */
export const intakeLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'Занадто багато заявок. Спробуйте пізніше.' },
});
