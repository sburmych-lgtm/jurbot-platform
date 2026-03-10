import { prisma } from '@jurbot/db';
import type { PaginationParams } from '../utils/pagination.js';

export async function listByCaseId(caseId: string, params: PaginationParams) {
  const { cursor, limit = 20 } = params;

  const items = await prisma.message.findMany({
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    where: { caseId },
    orderBy: { createdAt: 'desc' },
    include: {
      sender: { select: { id: true, name: true, role: true, avatarUrl: true } },
    },
  });

  const hasMore = items.length > limit;
  if (hasMore) items.pop();
  return { items, meta: { cursor: items.at(-1)?.id, hasMore } };
}

export async function create(caseId: string, senderId: string, text: string) {
  return prisma.message.create({
    data: { caseId, senderId, text },
    include: {
      sender: { select: { id: true, name: true, role: true, avatarUrl: true } },
    },
  });
}
