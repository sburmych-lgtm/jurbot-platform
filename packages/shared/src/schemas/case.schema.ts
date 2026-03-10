import { z } from 'zod';

export const createCaseSchema = z.object({
  title: z.string().min(1, "Назва справи обов'язкова"),
  category: z.enum(['FAMILY','CIVIL','COMMERCIAL','CRIMINAL','MIGRATION','REALESTATE','LABOR','OTHER']),
  urgency: z.enum(['URGENT','WEEK','NORMAL']).default('NORMAL'),
  description: z.string().optional(),
  clientId: z.string().uuid(),
});
export const updateCaseSchema = z.object({
  title: z.string().min(1).optional(),
  status: z.enum(['INTAKE','ANALYSIS','PREPARATION','FILED','AWAITING','COMPLETED']).optional(),
  urgency: z.enum(['URGENT','WEEK','NORMAL']).optional(),
  description: z.string().optional(),
  courtName: z.string().optional(),
  courtDate: z.string().datetime().optional(),
  courtRoom: z.string().optional(),
  nextAction: z.string().optional(),
  nextDate: z.string().datetime().optional(),
});

export type CreateCaseInput = z.infer<typeof createCaseSchema>;
export type UpdateCaseInput = z.infer<typeof updateCaseSchema>;
