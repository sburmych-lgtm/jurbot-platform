import { prisma } from '@jurbot/db';
import { AppError } from '../middleware/errorHandler.js';
import { generateCaseNumber } from '../utils/caseNumber.js';
import type { PaginationParams } from '../utils/pagination.js';
import type { CreateCaseInput, UpdateCaseInput } from '@jurbot/shared';

export async function list(params: PaginationParams & { userId?: string; role?: string }) {
  const { cursor, limit = 20, userId, role } = params;

  const where: Record<string, unknown> = { deletedAt: null };
  if (role === 'CLIENT' && userId) {
    const profile = await prisma.clientProfile.findUnique({ where: { userId } });
    if (!profile) return { items: [], meta: { hasMore: false } };
    where.clientId = profile.id;
  } else if (role === 'LAWYER' && userId) {
    const profile = await prisma.lawyerProfile.findUnique({ where: { userId } });
    if (!profile) return { items: [], meta: { hasMore: false } };
    where.lawyerId = profile.id;
  }

  const items = await prisma.case.findMany({
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      client: { include: { user: { select: { id: true, name: true, email: true } } } },
      lawyer: { include: { user: { select: { id: true, name: true } } } },
      _count: { select: { documents: true, messages: true, checklist: true } },
    },
  });

  const hasMore = items.length > limit;
  if (hasMore) items.pop();
  return { items, meta: { cursor: items.at(-1)?.id, hasMore } };
}

export async function getById(id: string, userId?: string, userRole?: string) {
  const caseRecord = await prisma.case.findUnique({
    where: { id },
    include: {
      client: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
      lawyer: { include: { user: { select: { id: true, name: true } } } },
      _count: { select: { documents: true, messages: true, checklist: true } },
    },
  });

  if (!caseRecord || caseRecord.deletedAt) {
    throw new AppError(404, 'Справу не знайдено');
  }

  if (userRole === 'LAWYER' && userId) {
    const profile = await prisma.lawyerProfile.findUnique({ where: { userId } });
    if (!profile || caseRecord.lawyerId !== profile.id) {
      throw new AppError(403, 'Ви не маєте доступу до цієї справи');
    }
  }

  return caseRecord;
}

export async function create(input: CreateCaseInput, lawyerUserId: string) {
  const lawyerProfile = await prisma.lawyerProfile.findUnique({
    where: { userId: lawyerUserId },
  });
  if (!lawyerProfile) {
    throw new AppError(400, 'Профіль адвоката не знайдено');
  }

  const clientProfile = await prisma.clientProfile.findUnique({
    where: { id: input.clientId },
  });
  if (!clientProfile) {
    throw new AppError(400, 'Профіль клієнта не знайдено');
  }

  // Bug 2 fix: verify client belongs to the same org
  if (clientProfile.orgId && lawyerProfile.orgId && clientProfile.orgId !== lawyerProfile.orgId) {
    throw new AppError(403, 'Клієнт належить до іншої організації');
  }

  const caseNumber = generateCaseNumber();

  return prisma.case.create({
    data: {
      caseNumber,
      title: input.title,
      category: input.category as any,
      urgency: (input.urgency ?? 'NORMAL') as any,
      description: input.description,
      lawyerId: lawyerProfile.id,
      clientId: input.clientId,
      orgId: lawyerProfile.orgId ?? undefined,
    },
    include: {
      client: { include: { user: { select: { id: true, name: true, email: true } } } },
      lawyer: { include: { user: { select: { id: true, name: true } } } },
    },
  });
}

export async function update(id: string, input: UpdateCaseInput, userId: string) {
  const profile = await prisma.lawyerProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new AppError(403, 'Профіль адвоката не знайдено');
  }

  const existing = await prisma.case.findFirst({
    where: { id, lawyerId: profile.id, deletedAt: null },
  });
  if (!existing) {
    throw new AppError(404, 'Справу не знайдено');
  }

  return prisma.case.update({
    where: { id },
    data: {
      ...input,
      courtDate: input.courtDate ? new Date(input.courtDate) : undefined,
      nextDate: input.nextDate ? new Date(input.nextDate) : undefined,
    } as any,
    include: {
      client: { include: { user: { select: { id: true, name: true, email: true } } } },
      lawyer: { include: { user: { select: { id: true, name: true } } } },
    },
  });
}

export async function softDelete(id: string, userId: string) {
  const profile = await prisma.lawyerProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new AppError(403, 'Профіль адвоката не знайдено');
  }

  const existing = await prisma.case.findFirst({
    where: { id, lawyerId: profile.id, deletedAt: null },
  });
  if (!existing) {
    throw new AppError(404, 'Справу не знайдено');
  }

  await prisma.case.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

/**
 * B-040: Find or create a case when a booking is confirmed by the lawyer.
 * Product rule: booking ≠ active case. Case activates AFTER lawyer confirms.
 */
export async function findOrCreateForBooking(
  lawyerProfileId: string,
  clientProfileId: string,
  orgId: string | null,
): Promise<{ id: string; caseNumber: string; isNew: boolean }> {
  // Check for existing active case between this lawyer and client
  const existing = await prisma.case.findFirst({
    where: {
      lawyerId: lawyerProfileId,
      clientId: clientProfileId,
      deletedAt: null,
    },
    select: { id: true, caseNumber: true },
  });

  if (existing) {
    return { id: existing.id, caseNumber: existing.caseNumber, isNew: false };
  }

  // Create new case with INTAKE status (initial state after consultation confirmed)
  const caseNumber = generateCaseNumber();
  const newCase = await prisma.case.create({
    data: {
      caseNumber,
      title: 'Нова консультація',
      category: 'OTHER' as any,
      urgency: 'NORMAL' as any,
      status: 'INTAKE' as any,
      lawyerId: lawyerProfileId,
      clientId: clientProfileId,
      orgId: orgId ?? undefined,
    },
    select: { id: true, caseNumber: true },
  });

  return { id: newCase.id, caseNumber: newCase.caseNumber, isNew: true };
}

/** Verify that a CLIENT user has access to a specific case */
export async function verifyClientAccess(caseId: string, userId: string): Promise<void> {
  const profile = await prisma.clientProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new AppError(403, 'Профіль клієнта не знайдено');
  }

  const caseRecord = await prisma.case.findUnique({ where: { id: caseId } });
  if (!caseRecord || caseRecord.deletedAt) {
    throw new AppError(404, 'Справу не знайдено');
  }

  if (caseRecord.clientId !== profile.id) {
    throw new AppError(403, 'Ви не маєте доступу до цієї справи');
  }
}
