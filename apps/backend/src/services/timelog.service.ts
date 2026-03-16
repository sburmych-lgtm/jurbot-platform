import { prisma } from '@jurbot/db';
import { AppError } from '../middleware/errorHandler.js';
import type { PaginationParams } from '../utils/pagination.js';
import type { CreateTimeLogInput, UpdateTimeLogInput } from '@jurbot/shared';

export async function list(params: PaginationParams & { caseId?: string; lawyerUserId: string }) {
  const { cursor, limit = 20, caseId, lawyerUserId } = params;

  const lawyerProfile = await prisma.lawyerProfile.findUnique({
    where: { userId: lawyerUserId },
  });
  if (!lawyerProfile) return { items: [], meta: { hasMore: false } };

  const where: Record<string, unknown> = { lawyerId: lawyerProfile.id };
  if (caseId) {
    where.caseId = caseId;
  }

  const items = await prisma.timeLog.findMany({
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    where,
    orderBy: { date: 'desc' },
    include: {
      case: { select: { id: true, caseNumber: true, title: true } },
    },
  });

  const hasMore = items.length > limit;
  if (hasMore) items.pop();
  return { items, meta: { cursor: items.at(-1)?.id, hasMore } };
}

export async function create(input: CreateTimeLogInput, lawyerUserId: string) {
  const lawyerProfile = await prisma.lawyerProfile.findUnique({
    where: { userId: lawyerUserId },
  });
  if (!lawyerProfile) {
    throw new AppError(400, 'Профіль адвоката не знайдено');
  }

  // Bug 11 fix: verify case belongs to this lawyer
  const caseRecord = await prisma.case.findFirst({
    where: { id: input.caseId, lawyerId: lawyerProfile.id, deletedAt: null },
  });
  if (!caseRecord) {
    throw new AppError(404, 'Справу не знайдено');
  }

  return prisma.timeLog.create({
    data: {
      lawyerId: lawyerProfile.id,
      caseId: input.caseId,
      description: input.description,
      minutes: input.minutes,
      date: input.date ? new Date(input.date) : new Date(),
      billable: input.billable ?? true,
    },
    include: {
      case: { select: { id: true, caseNumber: true, title: true } },
    },
  });
}

export async function update(id: string, input: UpdateTimeLogInput, lawyerUserId: string) {
  const lawyerProfile = await prisma.lawyerProfile.findUnique({
    where: { userId: lawyerUserId },
  });
  if (!lawyerProfile) {
    throw new AppError(403, 'Профіль адвоката не знайдено');
  }

  const existing = await prisma.timeLog.findFirst({
    where: { id, lawyerId: lawyerProfile.id },
  });
  if (!existing) {
    throw new AppError(404, 'Запис часу не знайдено');
  }

  return prisma.timeLog.update({
    where: { id },
    data: input,
    include: {
      case: { select: { id: true, caseNumber: true, title: true } },
    },
  });
}

export async function remove(id: string, lawyerUserId: string) {
  const lawyerProfile = await prisma.lawyerProfile.findUnique({
    where: { userId: lawyerUserId },
  });
  if (!lawyerProfile) {
    throw new AppError(403, 'Профіль адвоката не знайдено');
  }

  const existing = await prisma.timeLog.findFirst({
    where: { id, lawyerId: lawyerProfile.id },
  });
  if (!existing) {
    throw new AppError(404, 'Запис часу не знайдено');
  }

  await prisma.timeLog.delete({ where: { id } });
}
