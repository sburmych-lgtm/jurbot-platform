import { z } from 'zod';

export const createTimeLogSchema = z.object({
  caseId: z.string().uuid(),
  description: z.string().min(1, "Опис обов'язковий"),
  minutes: z.number().int().positive(),
  date: z.string().datetime().optional(),
  billable: z.boolean().default(true),
});
export const updateTimeLogSchema = z.object({
  description: z.string().min(1).optional(),
  minutes: z.number().int().positive().optional(),
  billable: z.boolean().optional(),
});

export type CreateTimeLogInput = z.infer<typeof createTimeLogSchema>;
export type UpdateTimeLogInput = z.infer<typeof updateTimeLogSchema>;
