import { prisma } from '@jurbot/db';
import { AppError } from '../middleware/errorHandler.js';
import { generateBookingRef } from '../utils/refNumber.js';
import { APPOINTMENT_TYPES } from '@jurbot/shared';
import type { PaginationParams } from '../utils/pagination.js';
import type { CreateAppointmentInput, UpdateAppointmentInput } from '@jurbot/shared';

export async function list(params: PaginationParams & { userId?: string; role?: string }) {
  const { cursor, limit = 20, userId, role } = params;

  const where: Record<string, unknown> = {};
  if (role === 'CLIENT' && userId) {
    const profile = await prisma.clientProfile.findUnique({ where: { userId } });
    if (!profile) return { items: [], meta: { hasMore: false } };
    where.clientId = profile.id;
  }

  const items = await prisma.appointment.findMany({
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    where,
    orderBy: { date: 'asc' },
    include: {
      client: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
      lawyer: { include: { user: { select: { id: true, name: true } } } },
      case: { select: { id: true, caseNumber: true, title: true } },
    },
  });

  const hasMore = items.length > limit;
  if (hasMore) items.pop();
  return { items, meta: { cursor: items.at(-1)?.id, hasMore } };
}

export async function getById(id: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      client: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
      lawyer: { include: { user: { select: { id: true, name: true } } } },
      case: { select: { id: true, caseNumber: true, title: true } },
      reminders: true,
    },
  });

  if (!appointment) {
    throw new AppError(404, 'Запис не знайдено');
  }
  return appointment;
}

export async function create(input: CreateAppointmentInput, userId: string, userRole: string) {
  // Resolve lawyer profile
  const lawyerProfile = await prisma.lawyerProfile.findUnique({
    where: { id: input.lawyerId },
  });
  if (!lawyerProfile) {
    throw new AppError(400, 'Профіль адвоката не знайдено');
  }

  // Resolve client profile
  let clientId = input.clientId;
  if (!clientId && userRole === 'CLIENT') {
    const profile = await prisma.clientProfile.findUnique({ where: { userId } });
    if (!profile) throw new AppError(400, 'Профіль клієнта не знайдено');
    clientId = profile.id;
  }
  if (!clientId) {
    throw new AppError(400, 'clientId обов\'язковий');
  }

  // Resolve type details
  const typeInfo = APPOINTMENT_TYPES.find((t) => t.id === input.type);
  if (!typeInfo) {
    throw new AppError(400, 'Невідомий тип консультації');
  }

  // Check for time conflicts
  const appointmentDate = new Date(input.date);
  const endDate = new Date(appointmentDate.getTime() + typeInfo.duration * 60 * 1000);

  const conflict = await prisma.appointment.findFirst({
    where: {
      lawyerId: input.lawyerId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      date: { lt: endDate },
      AND: {
        date: { gte: new Date(appointmentDate.getTime() - 90 * 60 * 1000) },
      },
    },
  });

  if (conflict) {
    throw new AppError(409, 'Цей час вже зайнятий');
  }

  const refNumber = generateBookingRef();

  return prisma.appointment.create({
    data: {
      refNumber,
      type: input.type as any,
      status: 'PENDING' as any,
      date: appointmentDate,
      duration: typeInfo.duration,
      price: typeInfo.price,
      notes: input.notes,
      lawyerId: input.lawyerId,
      clientId,
      caseId: input.caseId,
    },
    include: {
      client: { include: { user: { select: { id: true, name: true, email: true } } } },
      lawyer: { include: { user: { select: { id: true, name: true } } } },
    },
  });
}

export async function update(id: string, input: UpdateAppointmentInput) {
  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'Запис не знайдено');
  }

  return prisma.appointment.update({
    where: { id },
    data: {
      ...(input.status ? { status: input.status as any } : {}),
      ...(input.date ? { date: new Date(input.date) } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
    include: {
      client: { include: { user: { select: { id: true, name: true, email: true } } } },
      lawyer: { include: { user: { select: { id: true, name: true } } } },
    },
  });
}

export async function remove(id: string) {
  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'Запис не знайдено');
  }

  await prisma.appointment.update({
    where: { id },
    data: { status: 'CANCELLED' as any },
  });
}

export async function getAvailableSlots(date: string, lawyerId?: string) {
  const targetDate = new Date(date);
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const where: Record<string, unknown> = {
    date: { gte: startOfDay, lte: endOfDay },
    status: { in: ['PENDING', 'CONFIRMED'] },
  };
  if (lawyerId) {
    where.lawyerId = lawyerId;
  }

  const booked = await prisma.appointment.findMany({
    where,
    select: { date: true, duration: true },
  });

  // Generate available 30-min slots from 9:00 to 18:00
  const slots: string[] = [];
  for (let hour = 9; hour < 18; hour++) {
    for (const minute of [0, 30]) {
      const slotTime = new Date(startOfDay);
      slotTime.setHours(hour, minute, 0, 0);

      const isBooked = booked.some((b) => {
        const bookingEnd = new Date(b.date.getTime() + b.duration * 60 * 1000);
        return slotTime >= b.date && slotTime < bookingEnd;
      });

      if (!isBooked) {
        slots.push(slotTime.toISOString());
      }
    }
  }

  return slots;
}

/** Verify that a CLIENT user has access to a specific appointment */
export async function verifyClientAccess(appointmentId: string, userId: string): Promise<void> {
  const profile = await prisma.clientProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new AppError(403, 'Профіль клієнта не знайдено');
  }

  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) {
    throw new AppError(404, 'Запис не знайдено');
  }

  if (appointment.clientId !== profile.id) {
    throw new AppError(403, 'Ви не маєте доступу до цього запису');
  }
}
