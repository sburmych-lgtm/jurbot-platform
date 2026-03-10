import { prisma } from '@jurbot/db';
import { AppError } from '../middleware/errorHandler.js';
import type { PaginationParams } from '../utils/pagination.js';
import type { CreateDocumentInput, UpdateDocumentInput, GenerateDocumentInput } from '@jurbot/shared';
import { TEMPLATES } from '@jurbot/shared';

export async function list(params: PaginationParams & { userId?: string; role?: string }) {
  const { cursor, limit = 20, userId, role } = params;

  const where: Record<string, unknown> = { deletedAt: null };
  if (role === 'CLIENT' && userId) {
    // CLIENT sees only documents from their own cases
    const profile = await prisma.clientProfile.findUnique({ where: { userId } });
    if (!profile) return { items: [], meta: { hasMore: false } };
    const caseIds = await prisma.case.findMany({
      where: { clientId: profile.id, deletedAt: null },
      select: { id: true },
    });
    where.caseId = { in: caseIds.map((c) => c.id) };
  }

  const items = await prisma.document.findMany({
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      case: { select: { id: true, caseNumber: true, title: true } },
    },
  });

  const hasMore = items.length > limit;
  if (hasMore) items.pop();
  return { items, meta: { cursor: items.at(-1)?.id, hasMore } };
}

export async function getById(id: string) {
  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      case: { select: { id: true, caseNumber: true, title: true, clientId: true } },
      upload: true,
    },
  });

  if (!doc || doc.deletedAt) {
    throw new AppError(404, 'Документ не знайдено');
  }
  return doc;
}

export async function create(input: CreateDocumentInput) {
  // Verify case exists
  const caseRecord = await prisma.case.findUnique({ where: { id: input.caseId } });
  if (!caseRecord || caseRecord.deletedAt) {
    throw new AppError(404, 'Справу не знайдено');
  }

  return prisma.document.create({
    data: {
      name: input.name,
      caseId: input.caseId,
      type: input.type,
      content: input.content,
    },
    include: {
      case: { select: { id: true, caseNumber: true, title: true } },
    },
  });
}

export async function update(id: string, input: UpdateDocumentInput) {
  const existing = await prisma.document.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    throw new AppError(404, 'Документ не знайдено');
  }

  return prisma.document.update({
    where: { id },
    data: input as any,
    include: {
      case: { select: { id: true, caseNumber: true, title: true } },
    },
  });
}

export async function softDelete(id: string) {
  const existing = await prisma.document.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    throw new AppError(404, 'Документ не знайдено');
  }

  await prisma.document.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function generate(input: GenerateDocumentInput) {
  const template = TEMPLATES.find((t) => t.id === input.templateId);
  if (!template) {
    throw new AppError(404, 'Шаблон не знайдено');
  }

  // Verify case exists
  const caseRecord = await prisma.case.findUnique({ where: { id: input.caseId } });
  if (!caseRecord || caseRecord.deletedAt) {
    throw new AppError(404, 'Справу не знайдено');
  }

  // Generate content by replacing placeholders in a simple text template
  const content = generateContent(template.id, template.name, input.data);

  return prisma.document.create({
    data: {
      name: `${template.name}.pdf`,
      caseId: input.caseId,
      type: template.id,
      content,
    },
    include: {
      case: { select: { id: true, caseNumber: true, title: true } },
    },
  });
}

function generateContent(templateId: string, templateName: string, data: Record<string, string>): string {
  const date = new Date().toLocaleDateString('uk-UA');
  const lines: string[] = [];

  lines.push(templateName.toUpperCase());
  lines.push('');
  lines.push(`Дата: ${date}`);
  lines.push('');

  for (const [key, value] of Object.entries(data)) {
    if (value) {
      lines.push(`${key}: ${value}`);
    }
  }

  lines.push('');
  lines.push('________________________');
  lines.push('(підпис)');

  return lines.join('\n');
}

/** Verify that a CLIENT user has access to a specific document */
export async function verifyClientAccess(docId: string, userId: string): Promise<void> {
  const profile = await prisma.clientProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new AppError(403, 'Профіль клієнта не знайдено');
  }

  const doc = await prisma.document.findUnique({
    where: { id: docId },
    include: { case: { select: { clientId: true } } },
  });

  if (!doc || doc.deletedAt) {
    throw new AppError(404, 'Документ не знайдено');
  }

  if (doc.case.clientId !== profile.id) {
    throw new AppError(403, 'Ви не маєте доступу до цього документа');
  }
}
