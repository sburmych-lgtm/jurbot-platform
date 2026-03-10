import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import type { UserPayload } from '@jurbot/shared';

export function signAccessToken(payload: UserPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtAccessExpiry as jwt.SignOptions['expiresIn'],
  });
}

export function signRefreshToken(payload: UserPayload): string {
  return jwt.sign(payload, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpiry as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): UserPayload {
  return jwt.verify(token, config.jwtSecret) as UserPayload;
}

export function verifyRefreshToken(token: string): UserPayload {
  return jwt.verify(token, config.jwtRefreshSecret) as UserPayload;
}
