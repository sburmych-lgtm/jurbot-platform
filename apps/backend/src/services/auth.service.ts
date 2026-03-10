import { prisma } from '@jurbot/db';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signAccessToken, signRefreshToken } from '../utils/jwt.js';
import { AppError } from '../middleware/errorHandler.js';
import type { RegisterInput, LoginInput, UserPayload, TokenPair } from '@jurbot/shared';

function toPayload(user: { id: string; email: string; role: string; name: string }): UserPayload {
  return { id: user.id, email: user.email, role: user.role, name: user.name };
}

function generateTokens(payload: UserPayload): TokenPair {
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

export async function register(input: RegisterInput): Promise<{ user: UserPayload; tokens: TokenPair }> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError(409, 'Користувач з таким email вже існує');
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      password: passwordHash,
      name: input.name,
      role: input.role as any,
      phone: input.phone,
      city: input.city,
      ...(input.role === 'LAWYER'
        ? { lawyerProfile: { create: {} } }
        : { clientProfile: { create: { accessCode: Math.random().toString().slice(2, 8) } } }),
    },
  });

  const payload = toPayload(user);
  return { user: payload, tokens: generateTokens(payload) };
}

export async function login(input: LoginInput): Promise<{ user: UserPayload; tokens: TokenPair }> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !user.isActive) {
    throw new AppError(401, 'Невірний email або пароль');
  }

  const valid = await comparePassword(input.password, user.password);
  if (!valid) {
    throw new AppError(401, 'Невірний email або пароль');
  }

  const payload = toPayload(user);
  return { user: payload, tokens: generateTokens(payload) };
}

export async function portalLogin(accessCode: string): Promise<{ user: UserPayload; tokens: TokenPair }> {
  const profile = await prisma.clientProfile.findUnique({
    where: { accessCode },
    include: { user: true },
  });

  if (!profile || !profile.user.isActive) {
    throw new AppError(401, 'Невірний код доступу');
  }

  const payload = toPayload(profile.user);
  return { user: payload, tokens: generateTokens(payload) };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      lawyerProfile: true,
      clientProfile: true,
    },
  });

  if (!user) {
    throw new AppError(404, 'Користувача не знайдено');
  }

  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}
