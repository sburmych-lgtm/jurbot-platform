import { prisma } from '@jurbot/db';
import { AppError } from '../middleware/errorHandler.js';
import type { PaginationParams } from '../utils/pagination.js';
import type { NotificationType } from '@jurbot/shared';

export async function list(params: PaginationParams & { userId: string }) {
  const { cursor, limit = 20, userId } = params;

  const items = await prisma.notification.findMany({
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  const hasMore = items.length > limit;
  if (hasMore) items.pop();
  return { items, meta: { cursor: items.at(-1)?.id, hasMore } };
}

export async function markAsRead(notificationId: string, userId: string) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw new AppError(404, 'Сповіщення не знайдено');
  }

  if (notification.userId !== userId) {
    throw new AppError(403, 'Ви не маєте доступу до цього сповіщення');
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
}

export async function markAllAsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

/** Create a notification (used by other services) */
export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type as any,
      title: params.title,
      body: params.body,
      link: params.link,
    },
  });
}
