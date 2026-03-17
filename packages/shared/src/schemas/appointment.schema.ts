import { z } from 'zod';

export const createAppointmentSchema = z.object({
  type: z.enum(['FREE', 'CONSULT', 'ANALYSIS']),
  date: z.string().datetime({ offset: true }),
  lawyerId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  caseId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export const updateAppointmentSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).optional(),
  date: z.string().datetime({ offset: true }).optional(),
  notes: z.string().optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
