import { prisma } from '@jurbot/db';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AppError } from '../middleware/errorHandler.js';
import { config } from '../config.js';
import type { PaginationParams } from '../utils/pagination.js';
import type { CreateDocumentInput, UpdateDocumentInput, GenerateDocumentInput } from '@jurbot/shared';
import { TEMPLATES } from '@jurbot/shared';

export async function list(params: PaginationParams & { userId?: string; role?: string }) {
  const { cursor, limit = 20, userId, role } = params;

  const where: Record<string, unknown> = { deletedAt: null };
  if (role === 'CLIENT' && userId) {
    const profile = await prisma.clientProfile.findUnique({ where: { userId } });
    if (!profile) return { items: [], meta: { hasMore: false } };
    const caseIds = await prisma.case.findMany({
      where: { clientId: profile.id, deletedAt: null },
      select: { id: true },
    });
    where.caseId = { in: caseIds.map((c) => c.id) };
  } else if (role === 'LAWYER' && userId) {
    const profile = await prisma.lawyerProfile.findUnique({ where: { userId } });
    if (!profile) return { items: [], meta: { hasMore: false } };
    const caseIds = await prisma.case.findMany({
      where: { lawyerId: profile.id, deletedAt: null },
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

export async function getById(id: string, userId?: string, userRole?: string) {
  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      case: { select: { id: true, caseNumber: true, title: true, clientId: true, lawyerId: true } },
      upload: true,
    },
  });

  if (!doc || doc.deletedAt) {
    throw new AppError(404, 'Документ не знайдено');
  }

  if (userRole === 'LAWYER' && userId) {
    const profile = await prisma.lawyerProfile.findUnique({ where: { userId } });
    if (!profile || doc.case.lawyerId !== profile.id) {
      throw new AppError(403, 'Ви не маєте доступу до цього документа');
    }
  }

  return doc;
}

async function verifyCaseOwnership(caseId: string, userId: string) {
  const caseRecord = await prisma.case.findUnique({ where: { id: caseId } });
  if (!caseRecord || caseRecord.deletedAt) {
    throw new AppError(404, 'Справу не знайдено');
  }

  const profile = await prisma.lawyerProfile.findUnique({ where: { userId } });
  if (!profile || caseRecord.lawyerId !== profile.id) {
    throw new AppError(403, 'Ви не маєте доступу до цієї справи');
  }

  return caseRecord;
}

export async function create(input: CreateDocumentInput, userId: string) {
  await verifyCaseOwnership(input.caseId, userId);

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

export async function update(id: string, input: UpdateDocumentInput, userId: string) {
  const existing = await prisma.document.findUnique({
    where: { id },
    include: { case: { select: { lawyerId: true } } },
  });
  if (!existing || existing.deletedAt) {
    throw new AppError(404, 'Документ не знайдено');
  }

  const profile = await prisma.lawyerProfile.findUnique({ where: { userId } });
  if (!profile || existing.case.lawyerId !== profile.id) {
    throw new AppError(403, 'Ви не маєте доступу до цього документа');
  }

  return prisma.document.update({
    where: { id },
    data: input as any,
    include: {
      case: { select: { id: true, caseNumber: true, title: true } },
    },
  });
}

export async function softDelete(id: string, userId: string) {
  const existing = await prisma.document.findUnique({
    where: { id },
    include: { case: { select: { lawyerId: true } } },
  });
  if (!existing || existing.deletedAt) {
    throw new AppError(404, 'Документ не знайдено');
  }

  const profile = await prisma.lawyerProfile.findUnique({ where: { userId } });
  if (!profile || existing.case.lawyerId !== profile.id) {
    throw new AppError(403, 'Ви не маєте доступу до цього документа');
  }

  await prisma.document.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function generate(input: GenerateDocumentInput, userId: string) {
  const template = TEMPLATES.find((t) => t.id === input.templateId);
  if (!template) {
    throw new AppError(404, 'Шаблон не знайдено');
  }

  if (input.caseId) {
    await verifyCaseOwnership(input.caseId, userId);
  }

  const content = await generateWithGemini(template.name, template.id, input.data);

  if (input.caseId) {
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

  return {
    id: crypto.randomUUID(),
    name: `${template.name}.pdf`,
    type: template.id,
    content,
    status: 'DRAFT',
    persisted: false,
    createdAt: new Date().toISOString(),
  };
}

async function generateWithGemini(
  templateName: string,
  templateId: string,
  data: Record<string, string>,
): Promise<string> {
  if (!config.geminiApiKey) {
    throw new AppError(500, 'AI-генерація тимчасово недоступна: відсутній API ключ');
  }

  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const fieldsSummary = Object.entries(data)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

  const prompt = `Ти — досвідчений український юрист. Згенеруй повний текст юридичного документа українською мовою.

Тип документа: ${templateName} (${templateId})
Дата: ${new Date().toLocaleDateString('uk-UA')}

Дані від користувача:
${fieldsSummary}

Вимоги:
- Документ має бути юридично грамотним відповідно до законодавства України
- Використовуй офіційний діловий стиль
- Включи всі необхідні реквізити для цього типу документа
- Структуруй документ з правильними заголовками та нумерацією
- В кінці залиш місце для підпису та дати
- Відповідай ТІЛЬКИ текстом документа, без пояснень чи коментарів`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  if (!text) {
    throw new AppError(500, 'AI не зміг згенерувати документ. Спробуйте ще раз.');
  }

  return text;
}

/** Upload a document from CLIENT to their active case */
export async function clientUpload(fileName: string, fileContent: string, userId: string) {
  const profile = await prisma.clientProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new AppError(403, 'Профіль клієнта не знайдено');
  }

  const activeCase = await prisma.case.findFirst({
    where: { clientId: profile.id, status: { not: 'COMPLETED' }, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!activeCase) {
    throw new AppError(400, 'У вас немає активної справи для завантаження файлу');
  }

  return prisma.document.create({
    data: {
      name: fileName,
      type: 'upload',
      content: fileContent,
      size: String(Buffer.byteLength(fileContent, 'utf-8')),
      status: 'DRAFT',
      caseId: activeCase.id,
      orgId: profile.orgId,
    },
    include: {
      case: { select: { id: true, caseNumber: true, title: true } },
    },
  });
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
