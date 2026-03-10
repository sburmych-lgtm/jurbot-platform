import { prisma } from '@jurbot/db';
import { AppError } from '../middleware/errorHandler.js';
import type { PaginationParams } from '../utils/pagination.js';
import type { UpdateUserInput } from '@jurbot/shared';

export async function list(params: PaginationParams & { role?: string }) {
  const { cursor, limit = 20, role } = params;
  const where = {
    deletedAt: null,
    ...(role ? { role: role as 'LAWYER' | 'CLIENT' } : {}),
  };

  const items = await prisma.user.findMany({
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, email: true, name: true, role: true,
      phone: true, city: true, avatarUrl: true, isActive: true,
      createdAt: true, updatedAt: true,
    },
  });

  const hasMore = items.length > limit;
  if (hasMore) items.pop();
  return { items, meta: { cursor: items.at(-1)?.id, hasMore } };
}

export async function getById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, email: true, name: true, role: true,
      phone: true, city: true, avatarUrl: true, isActive: true,
      createdAt: true, updatedAt: true,
      lawyerProfile: true,
      clientProfile: true,
    },
  });

  if (!user || user.isActive === false) {
    throw new AppError(404, 'Користувача не знайдено');
  }
  return user;
}

export async function update(id: string, input: UpdateUserInput) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.deletedAt) {
    throw new AppError(404, 'Користувача не знайдено');
  }

  const updated = await prisma.user.update({
    where: { id },
    data: input,
    select: {
      id: true, email: true, name: true, role: true,
      phone: true, city: true, avatarUrl: true, isActive: true,
      createdAt: true, updatedAt: true,
    },
  });
  return updated;
}

export async function softDelete(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.deletedAt) {
    throw new AppError(404, 'Користувача не знайдено');
  }

  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
}
