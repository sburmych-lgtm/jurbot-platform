import { Router } from 'express';
import { loginSchema, registerSchema, portalLoginSchema } from '@jurbot/shared';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { flexAuth } from '../middleware/telegramAuth.js';
import * as authService from '../services/auth.service.js';
import { authLimiter } from '../middleware/rateLimit.js';

export const authRouter = Router();

// Rate limit auth endpoints: 10 req/15min per IP
authRouter.use(authLimiter);

authRouter.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.status(201).json({ success: true, data: { user: result.user, accessToken: result.tokens.accessToken } });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ success: true, data: { user: result.user, accessToken: result.tokens.accessToken } });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/portal-login', validate(portalLoginSchema), async (req, res, next) => {
  try {
    const result = await authService.portalLogin(req.body.accessCode);
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ success: true, data: { user: result.user, accessToken: result.tokens.accessToken } });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', flexAuth, async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user!.id);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie('refreshToken');
  res.json({ success: true, data: { message: 'Вихід виконано' } });
});
