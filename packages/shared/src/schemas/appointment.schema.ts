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
  status: z.enum(['PENDING', 'CONFIRMED', 'AWAITING_CLIENT_RESPONSE', 'REJECTED', 'CANCELLED', 'CANCELLED_BY_CLIENT', 'COMPLETED', 'EXPIRED']).optional(),
  date: z.string().datetime({ offset: true }).optional(),
  notes: z.string().optional(),
});

export const rejectAppointmentSchema = z.object({
  reason: z.enum(['suggest_other_time', 'slot_unavailable', 'decline_client']),
  suggestedTime: z.string().datetime({ offset: true }).optional(),
});

export const respondToSuggestionSchema = z.object({
  accept: z.boolean(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type RejectAppointmentInput = z.infer<typeof rejectAppointmentSchema>;
export type RespondToSuggestionInput = z.infer<typeof respondToSuggestionSchema>;
