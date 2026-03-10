import { z } from 'zod';

export const createDocumentSchema = z.object({
  name: z.string().min(1, "Назва документа обов'язкова"),
  caseId: z.string().uuid(),
  type: z.string().optional(),
  content: z.string().optional(),
});
export const updateDocumentSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(['DRAFT','PENDING_SIGNATURE','READY','ARCHIVED']).optional(),
  content: z.string().optional(),
});
export const generateDocumentSchema = z.object({
  templateId: z.string().min(1),
  caseId: z.string().uuid(),
  data: z.record(z.string(), z.string()),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type GenerateDocumentInput = z.infer<typeof generateDocumentSchema>;
