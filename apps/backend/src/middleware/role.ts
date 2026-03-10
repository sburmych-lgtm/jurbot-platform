import type { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';
import type { Role } from '@jurbot/shared';

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(401, 'Не авторизовано');
    }
    if (!roles.includes(req.user.role as Role)) {
      throw new AppError(403, 'Недостатньо прав доступу');
    }
    next();
  };
}
