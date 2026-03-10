import { prisma } from '@jurbot/db';
import { AppError } from '../middleware/errorHandler.js';
import { getLeadScore } from '@jurbot/shared';
import { hashPassword } from '../utils/password.js';
import { generateCaseNumber } from '../utils/caseNumber.js';
import type { PaginationParams } from '../utils/pagination.js';
import type { IntakeSubmissionInput, CaseCategory, Urgency } from '@jurbot/shared';

export async function submit(input: IntakeSubmissionInput) {
  // Check if user already exists
  let user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user) {
    // Create new client user with a random password
    const tempPassword = await hashPassword(Math.random().toString(36).slice(2, 10));
    const accessCode = Math.random().toString().slice(2, 8);

    user = await prisma.user.create({
      data: {
        email: input.email,
        password: tempPassword,
        name: input.name,
        role: 'CLIENT',
        phone: input.phone,
        city: input.city,
        clientProfile: {
          create: { accessCode },
        },
      },
    });
  }

  // Get the client profile
  const clientProfile = await prisma.clientProfile.findUnique({
    where: { userId: user.id },
  });

  if (!clientProfile) {
    throw new AppError(400, 'Не вдалося знайти профіль клієнта');
  }

  // Check if there's already a submission for this client
  const existingSubmission = await prisma.intakeSubmission.findUnique({
    where: { clientId: clientProfile.id },
  });
  if (existingSubmission) {
    throw new AppError(409, 'Звернення від цього клієнта вже існує');
  }

  // Calculate lead score
  const leadScore = getLeadScore(
    input.category as CaseCategory,
    input.urgency as Urgency,
    input.description.length > 50,
  );

  const submission = await prisma.intakeSubmission.create({
    data: {
      clientId: clientProfile.id,
      category: input.category as any,
      urgency: input.urgency as any,
      description: input.description,
      city: input.city,
      leadScore,
    },
    include: {
      client: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
    },
  });

  return {
    submission,
    accessCode: clientProfile.accessCode,
  };
}

export async function list(params: PaginationParams) {
  const { cursor, limit = 20 } = params;

  const items = await prisma.intakeSubmission.findMany({
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: 'desc' },
    include: {
      client: { include: { user: { select: { id: true, name: true, email: true, phone: true, city: true } } } },
    },
  });

  const hasMore = items.length > limit;
  if (hasMore) items.pop();
  return { items, meta: { cursor: items.at(-1)?.id, hasMore } };
}

export async function getById(id: string) {
  const submission = await prisma.intakeSubmission.findUnique({
    where: { id },
    include: {
      client: { include: { user: { select: { id: true, name: true, email: true, phone: true, city: true } } } },
    },
  });

  if (!submission) {
    throw new AppError(404, 'Звернення не знайдено');
  }
  return submission;
}

export async function convertToCase(submissionId: string, lawyerUserId: string) {
  const submission = await prisma.intakeSubmission.findUnique({
    where: { id: submissionId },
    include: { client: true },
  });

  if (!submission) {
    throw new AppError(404, 'Звернення не знайдено');
  }

  const lawyerProfile = await prisma.lawyerProfile.findUnique({
    where: { userId: lawyerUserId },
  });
  if (!lawyerProfile) {
    throw new AppError(400, 'Профіль адвоката не знайдено');
  }

  const caseNumber = generateCaseNumber();

  const newCase = await prisma.case.create({
    data: {
      caseNumber,
      title: `${submission.category} — звернення`,
      category: submission.category,
      urgency: submission.urgency,
      description: submission.description,
      lawyerId: lawyerProfile.id,
      clientId: submission.clientId,
    },
    include: {
      client: { include: { user: { select: { id: true, name: true, email: true } } } },
      lawyer: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  return newCase;
}
