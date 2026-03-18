import { prisma } from '@jurbot/db';
import { APPOINTMENT_TYPES } from '@jurbot/shared';
import type {
  CreateAppointmentInput,
  UpdateAppointmentInput,
} from '@jurbot/shared';
import { AppError } from '../middleware/errorHandler.js';
import type { PaginationParams } from '../utils/pagination.js';
import { generateBookingRef } from '../utils/refNumber.js';
import { notifyLawyerByUserId } from './crossbot.service.js';

const DEFAULT_SLOTS = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
] as const;

type AvailabilityContext = {
  userId?: string;
  role?: string;
  lawyerId?: string;
};

type AvailabilityResponse = {
  date: string;
  lawyerId: string;
  configuredSlots: string[];
  bookedSlots: string[];
  availableSlots: string[];
};

function toDateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function parseDateInput(value: string): Date {
  const normalized = value.length === 10 ? `${value}T00:00:00.000Z` : value;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(400, 'Некоректна дата');
  }
  return parsed;
}

function dayBounds(dateKey: string): { start: Date; end: Date } {
  return {
    start: new Date(`${dateKey}T00:00:00.000Z`),
    end: new Date(`${dateKey}T23:59:59.999Z`),
  };
}

function normalizeSlots(slots: string[]): string[] {
  const valid = new Set<string>();
  for (const slot of slots) {
    if (/^([01]\d|2[0-3]):(00|30)$/.test(slot)) {
      valid.add(slot);
    }
  }
  return [...valid].sort();
}

function slotFromDate(value: Date): string {
  return value.toISOString().slice(11, 16);
}

function buildBookedSlots(
  items: Array<{ date: Date; duration: number }>,
): string[] {
  const slots = new Set<string>();

  for (const item of items) {
    for (let minute = 0; minute < item.duration; minute += 30) {
      const slotDate = new Date(item.date.getTime() + minute * 60 * 1000);
      slots.add(slotFromDate(slotDate));
    }
  }

  return [...slots].sort();
}

function overlaps(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
): boolean {
  return startA < endB && endA > startB;
}

async function resolveLawyerProfileForContext(
  context: AvailabilityContext,
): Promise<{ id: string; userId: string; orgId: string | null }> {
  const { userId, role, lawyerId } = context;

  if (lawyerId) {
    const explicit = await prisma.lawyerProfile.findUnique({
      where: { id: lawyerId },
      select: { id: true, userId: true, orgId: true },
    });
    if (!explicit) {
      throw new AppError(400, 'Профіль адвоката не знайдено');
    }
    return explicit;
  }

  if (!userId) {
    throw new AppError(401, 'Користувач не авторизований');
  }

  if (role === 'LAWYER') {
    const own = await prisma.lawyerProfile.findUnique({
      where: { userId },
      select: { id: true, userId: true, orgId: true },
    });
    if (!own) {
      throw new AppError(400, 'Профіль адвоката не знайдено');
    }
    return own;
  }

  if (role === 'CLIENT') {
    const clientProfile = await prisma.clientProfile.findUnique({
      where: { userId },
      include: { sourceToken: true },
    });
    if (!clientProfile) {
      throw new AppError(400, 'Профіль клієнта не знайдено');
    }

    if (clientProfile.sourceToken?.lawyerId) {
      const linkedLawyer = await prisma.lawyerProfile.findUnique({
        where: { id: clientProfile.sourceToken.lawyerId },
        select: { id: true, userId: true, orgId: true },
      });
      if (linkedLawyer) {
        return linkedLawyer;
      }
    }

    if (clientProfile.orgId) {
      const fallback = await prisma.lawyerProfile.findFirst({
        where: { orgId: clientProfile.orgId },
        select: { id: true, userId: true, orgId: true },
      });
      if (fallback) {
        return fallback;
      }
    }
  }

  throw new AppError(400, 'Не вдалося визначити адвоката для запису');
}

export async function list(
  params: PaginationParams & { userId?: string; role?: string },
) {
  const { cursor, limit = 20, userId, role } = params;
  const where: Record<string, unknown> = {};

  if (role === 'CLIENT' && userId) {
    const profile = await prisma.clientProfile.findUnique({ where: { userId } });
    if (!profile) {
      return { items: [], meta: { hasMore: false } };
    }
    where.clientId = profile.id;
  }

  if (role === 'LAWYER' && userId) {
    const profile = await prisma.lawyerProfile.findUnique({ where: { userId } });
    if (!profile) {
      return { items: [], meta: { hasMore: false } };
    }
    where.lawyerId = profile.id;
  }

  const items = await prisma.appointment.findMany({
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    where,
    orderBy: { date: 'asc' },
    include: {
      client: {
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
        },
      },
      lawyer: {
        include: { user: { select: { id: true, name: true } } },
      },
      case: { select: { id: true, caseNumber: true, title: true } },
    },
  });

  const hasMore = items.length > limit;
  if (hasMore) {
    items.pop();
  }

  return { items, meta: { cursor: items.at(-1)?.id, hasMore } };
}

export async function getById(id: string, userId?: string, userRole?: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      client: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      },
      lawyer: {
        include: { user: { select: { id: true, name: true } } },
      },
      case: { select: { id: true, caseNumber: true, title: true } },
      reminders: true,
    },
  });

  if (!appointment) {
    throw new AppError(404, 'Запис не знайдено');
  }

  if (userRole === 'LAWYER' && userId) {
    const profile = await prisma.lawyerProfile.findUnique({ where: { userId } });
    if (!profile || appointment.lawyerId !== profile.id) {
      throw new AppError(403, 'Ви не маєте доступу до цього запису');
    }
  }

  return appointment;
}

async function notifyLawyerAboutNewBooking(appointment: {
  refNumber: string;
  date: Date;
  type: string;
  client: { user: { name: string } };
  lawyer: { userId: string; orgId: string | null };
}): Promise<void> {
  const dateText = appointment.date.toLocaleDateString('uk-UA');
  const timeText = appointment.date.toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const safeClientName = appointment.client.user.name;

  const text =
    '📅 <b>Новий запис на консультацію</b>\n\n' +
    `👤 Клієнт: ${safeClientName}\n` +
    `🗓 Дата: ${dateText}\n` +
    `⏰ Час: ${timeText}\n` +
    `📋 Тип: ${appointment.type}\n` +
    `🧾 Номер: ${appointment.refNumber}`;

  const telegramSent = await notifyLawyerByUserId(appointment.lawyer.userId, {
    text,
    parseMode: 'HTML',
  });

  await prisma.notification.create({
    data: {
      userId: appointment.lawyer.userId,
      orgId: appointment.lawyer.orgId ?? undefined,
      type: 'APPOINTMENT_REMINDER',
      title: 'Новий запис на консультацію',
      body: `${safeClientName} записався(-лась) на ${dateText} о ${timeText}.`,
      telegramSent,
    },
  });
}

export async function create(
  input: CreateAppointmentInput,
  userId: string,
  userRole: string,
) {
  const lawyerProfile = await resolveLawyerProfileForContext({
    userId,
    role: userRole,
    lawyerId: input.lawyerId,
  });

  // Bug 7 fix: CLIENT role always uses own profile, ignore payload clientId
  let clientId = input.clientId;
  if (userRole === 'CLIENT') {
    const profile = await prisma.clientProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new AppError(400, 'Профіль клієнта не знайдено');
    }
    clientId = profile.id;
  }

  if (!clientId) {
    throw new AppError(400, 'clientId обовʼязковий');
  }

  const typeInfo = APPOINTMENT_TYPES.find((item) => item.id === input.type);
  if (!typeInfo) {
    throw new AppError(400, 'Невідомий тип консультації');
  }

  const appointmentDate = new Date(input.date);
  if (Number.isNaN(appointmentDate.getTime())) {
    throw new AppError(400, 'Некоректна дата запису');
  }

  // B-001/B-010: Reject appointments in the past
  if (appointmentDate.getTime() <= Date.now()) {
    throw new AppError(400, 'Неможливо записатися на минулий час');
  }

  const endDate = new Date(
    appointmentDate.getTime() + typeInfo.duration * 60 * 1000,
  );
  const dateKey = toDateKey(appointmentDate);
  const { start, end } = dayBounds(dateKey);

  const activeAppointments = await prisma.appointment.findMany({
    where: {
      lawyerId: lawyerProfile.id,
      status: { in: ['PENDING', 'CONFIRMED'] },
      date: { gte: start, lte: end },
    },
    select: { date: true, duration: true },
  });

  const conflict = activeAppointments.some((item: { date: Date; duration: number }) =>
    overlaps(
      appointmentDate,
      endDate,
      item.date,
      new Date(item.date.getTime() + item.duration * 60 * 1000),
    ),
  );
  if (conflict) {
    throw new AppError(409, 'Цей час вже зайнятий');
  }

  const availability = await getAvailability(appointmentDate.toISOString(), {
    userId,
    role: userRole,
    lawyerId: lawyerProfile.id,
  });
  const appointmentSlot = slotFromDate(appointmentDate);
  if (!availability.availableSlots.includes(appointmentSlot)) {
    throw new AppError(409, 'Обраний слот недоступний');
  }

  const refNumber = generateBookingRef();

  const created = await prisma.appointment.create({
    data: {
      refNumber,
      type: input.type as never,
      status: 'PENDING' as never,
      date: appointmentDate,
      duration: typeInfo.duration,
      price: typeInfo.price,
      notes: input.notes,
      lawyerId: lawyerProfile.id,
      clientId,
      caseId: input.caseId,
      orgId: lawyerProfile.orgId ?? undefined,
    },
    include: {
      client: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      lawyer: {
        select: {
          id: true,
          userId: true,
          orgId: true,
          user: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (userRole === 'CLIENT') {
    await notifyLawyerAboutNewBooking({
      refNumber: created.refNumber,
      date: created.date,
      type: created.type,
      client: { user: { name: created.client.user.name } },
      lawyer: { userId: created.lawyer.userId, orgId: created.lawyer.orgId },
    });
  }

  return created;
}

export async function update(id: string, input: UpdateAppointmentInput, userId: string) {
  const profile = await prisma.lawyerProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new AppError(403, 'Профіль адвоката не знайдено');
  }

  const existing = await prisma.appointment.findFirst({
    where: { id, lawyerId: profile.id },
  });
  if (!existing) {
    throw new AppError(404, 'Запис не знайдено');
  }

  return prisma.appointment.update({
    where: { id },
    data: {
      ...(input.status ? { status: input.status as never } : {}),
      ...(input.date ? { date: new Date(input.date) } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
    include: {
      client: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      lawyer: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });
}

export async function remove(id: string, userId: string, userRole: string) {
  let where: Record<string, unknown> = { id };

  if (userRole === 'LAWYER') {
    const profile = await prisma.lawyerProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new AppError(403, 'Профіль адвоката не знайдено');
    }
    where = { ...where, lawyerId: profile.id };
  } else if (userRole === 'CLIENT') {
    const profile = await prisma.clientProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new AppError(403, 'Профіль клієнта не знайдено');
    }
    where = { ...where, clientId: profile.id };
  } else {
    throw new AppError(403, 'Недостатньо прав доступу');
  }

  const existing = await prisma.appointment.findFirst({ where });
  if (!existing) {
    throw new AppError(404, 'Запис не знайдено');
  }

  if (existing.status === 'CANCELLED') {
    throw new AppError(400, 'Запис вже скасовано');
  }

  await prisma.appointment.update({
    where: { id },
    data: { status: 'CANCELLED' as never },
  });
}

/**
 * Check if a slot time (HH:MM) is in the past for the current day.
 * Uses UTC comparison — all slot times are treated as UTC.
 */
function isSlotInPast(slot: string, dateKey: string): boolean {
  const now = new Date();
  const todayKey = toDateKey(now);
  if (dateKey !== todayKey) return false;

  const slotDate = new Date(`${dateKey}T${slot}:00.000Z`);
  return slotDate.getTime() <= now.getTime();
}

export async function getAvailability(
  date: string,
  context: AvailabilityContext,
): Promise<AvailabilityResponse> {
  const parsedDate = parseDateInput(date);
  const dateKey = toDateKey(parsedDate);
  const { start, end } = dayBounds(dateKey);

  const lawyerProfile = await resolveLawyerProfileForContext(context);

  const persistedAvailability = await prisma.lawyerAvailability.findUnique({
    where: {
      lawyerId_date: {
        lawyerId: lawyerProfile.id,
        date: start,
      },
    },
  });

  const configuredSlots = normalizeSlots(
    persistedAvailability?.slots?.length
      ? persistedAvailability.slots
      : [...DEFAULT_SLOTS],
  );

  const bookedAppointments = await prisma.appointment.findMany({
    where: {
      lawyerId: lawyerProfile.id,
      status: { in: ['PENDING', 'CONFIRMED'] },
      date: { gte: start, lte: end },
    },
    select: { date: true, duration: true },
  });

  const bookedSlots = buildBookedSlots(bookedAppointments);

  // B-010: Filter out past slots for the current day
  const availableSlots = configuredSlots.filter(
    (slot) => !bookedSlots.includes(slot) && !isSlotInPast(slot, dateKey),
  );

  return {
    date: dateKey,
    lawyerId: lawyerProfile.id,
    configuredSlots,
    bookedSlots,
    availableSlots,
  };
}

export async function setAvailability(
  date: string,
  slots: string[],
  userId: string,
) {
  const lawyerProfile = await prisma.lawyerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!lawyerProfile) {
    throw new AppError(403, 'Тільки адвокат може керувати розкладом');
  }

  const parsedDate = parseDateInput(date);
  const dateKey = toDateKey(parsedDate);
  const dayStart = dayBounds(dateKey).start;
  const normalizedSlots = normalizeSlots(slots);

  await prisma.lawyerAvailability.upsert({
    where: {
      lawyerId_date: {
        lawyerId: lawyerProfile.id,
        date: dayStart,
      },
    },
    create: {
      lawyerId: lawyerProfile.id,
      date: dayStart,
      slots: normalizedSlots,
    },
    update: {
      slots: normalizedSlots,
    },
  });

  return getAvailability(dateKey, {
    userId,
    role: 'LAWYER',
    lawyerId: lawyerProfile.id,
  });
}

export async function getAvailableSlots(
  date: string,
  context: AvailabilityContext,
) {
  const availability = await getAvailability(date, context);
  return availability.availableSlots.map(
    (slot) => new Date(`${availability.date}T${slot}:00.000Z`).toISOString(),
  );
}

/** B-030: Lawyer confirms a pending appointment */
export async function confirmAppointment(id: string, userId: string) {
  const profile = await prisma.lawyerProfile.findUnique({ where: { userId } });
  if (!profile) throw new AppError(403, 'Профіль адвоката не знайдено');

  const appointment = await prisma.appointment.findFirst({
    where: { id, lawyerId: profile.id, status: 'PENDING' },
    include: { client: { include: { user: { select: { id: true, name: true } } } } },
  });
  if (!appointment) throw new AppError(404, 'Запис не знайдено або вже оброблено');

  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: 'CONFIRMED' as never },
    include: {
      client: { include: { user: { select: { id: true, name: true } } } },
      lawyer: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  // Create case for this booking (B-040)
  const { findOrCreateForBooking } = await import('./case.service.js');
  await findOrCreateForBooking(profile.id, appointment.clientId, profile.orgId);

  // Notify client
  await prisma.notification.create({
    data: {
      userId: appointment.client.user.id,
      type: 'APPOINTMENT_REMINDER' as never,
      title: 'Запис підтверджено',
      body: `Ваш запис на ${appointment.date.toLocaleDateString('uk-UA')} підтверджено адвокатом.`,
    },
  });

  return updated;
}

/** B-030: Lawyer rejects a pending appointment */
export async function rejectAppointment(
  id: string,
  userId: string,
  reason: string,
  suggestedTime?: string,
) {
  const profile = await prisma.lawyerProfile.findUnique({ where: { userId } });
  if (!profile) throw new AppError(403, 'Профіль адвоката не знайдено');

  const appointment = await prisma.appointment.findFirst({
    where: { id, lawyerId: profile.id, status: 'PENDING' },
    include: { client: { include: { user: { select: { id: true, name: true } } } } },
  });
  if (!appointment) throw new AppError(404, 'Запис не знайдено або вже оброблено');

  const newStatus = reason === 'suggest_other_time' ? 'AWAITING_CLIENT_RESPONSE' : 'REJECTED';

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      status: newStatus as never,
      reason,
      ...(suggestedTime ? { suggestedTime: new Date(suggestedTime) } : {}),
    },
    include: {
      client: { include: { user: { select: { id: true, name: true } } } },
      lawyer: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  // Notify client based on reason
  const notificationMessages: Record<string, { title: string; body: string }> = {
    suggest_other_time: {
      title: 'Адвокат пропонує інший час',
      body: suggestedTime
        ? `Адвокат пропонує перенести консультацію на ${new Date(suggestedTime).toLocaleString('uk-UA')}.`
        : 'Адвокат просить обрати інший час для консультації.',
    },
    slot_unavailable: {
      title: 'Обраний час недоступний',
      body: 'Обраний вами час уже неактуальний. Будь ласка, оберіть іншу годину.',
    },
    decline_client: {
      title: 'Адвокат не може прийняти запис',
      body: 'На жаль, адвокат не може взятися за цю справу.',
    },
  };

  const msg = notificationMessages[reason] ?? { title: 'Запис відхилено', body: 'Ваш запис було відхилено.' };

  await prisma.notification.create({
    data: {
      userId: appointment.client.user.id,
      type: 'APPOINTMENT_REMINDER' as never,
      title: msg.title,
      body: msg.body,
    },
  });

  return updated;
}

/** B-031: Client responds to lawyer's suggested time */
export async function respondToSuggestion(id: string, userId: string, accept: boolean) {
  const profile = await prisma.clientProfile.findUnique({ where: { userId } });
  if (!profile) throw new AppError(403, 'Профіль клієнта не знайдено');

  const appointment = await prisma.appointment.findFirst({
    where: { id, clientId: profile.id, status: 'AWAITING_CLIENT_RESPONSE' },
    include: { lawyer: { select: { userId: true } } },
  });
  if (!appointment) throw new AppError(404, 'Запис не знайдено або не очікує відповіді');

  if (accept && appointment.suggestedTime) {
    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'CONFIRMED' as never,
        date: appointment.suggestedTime,
        suggestedTime: null,
        reason: null,
      },
    });

    await prisma.notification.create({
      data: {
        userId: appointment.lawyer.userId,
        type: 'APPOINTMENT_REMINDER' as never,
        title: 'Клієнт прийняв запропонований час',
        body: `Консультацію перенесено на ${appointment.suggestedTime.toLocaleString('uk-UA')}.`,
      },
    });

    return updated;
  }

  // Client declined — cancel the appointment
  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: 'CANCELLED_BY_CLIENT' as never },
  });

  await prisma.notification.create({
    data: {
      userId: appointment.lawyer.userId,
      type: 'APPOINTMENT_REMINDER' as never,
      title: 'Клієнт відхилив запропонований час',
      body: 'Клієнт не прийняв запропонований час консультації.',
    },
  });

  return updated;
}

/** Verify that a CLIENT user has access to a specific appointment */
export async function verifyClientAccess(
  appointmentId: string,
  userId: string,
): Promise<void> {
  const profile = await prisma.clientProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new AppError(403, 'Профіль клієнта не знайдено');
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });
  if (!appointment) {
    throw new AppError(404, 'Запис не знайдено');
  }

  if (appointment.clientId !== profile.id) {
    throw new AppError(403, 'Ви не маєте доступу до цього запису');
  }
}
