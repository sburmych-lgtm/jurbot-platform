import { prisma } from '@jurbot/db';
import { AppError } from '../middleware/errorHandler.js';

export async function listByCaseId(caseId: string) {
  return prisma.checklistItem.findMany({
    where: { caseId },
    orderBy: { order: 'asc' },
  });
}

export async function create(caseId: string, text: string) {
  const maxOrder = await prisma.checklistItem.aggregate({
    where: { caseId },
    _max: { order: true },
  });
  return prisma.checklistItem.create({
    data: {
      caseId,
      text,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });
}

export async function toggleDone(itemId: string) {
  const item = await prisma.checklistItem.findUnique({ where: { id: itemId } });
  if (!item) {
    throw new AppError(404, 'Елемент чек-листа не знайдено');
  }
  return prisma.checklistItem.update({
    where: { id: itemId },
    data: { done: !item.done },
  });
}

export async function remove(itemId: string) {
  const item = await prisma.checklistItem.findUnique({ where: { id: itemId } });
  if (!item) {
    throw new AppError(404, 'Елемент чек-листа не знайдено');
  }
  await prisma.checklistItem.delete({ where: { id: itemId } });
}
