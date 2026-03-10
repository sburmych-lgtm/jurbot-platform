import { z } from 'zod';

export const intakeSubmissionSchema = z.object({
  name: z.string().min(2, "Ім'я обов'язкове"),
  email: z.string().email('Невірний формат email'),
  phone: z.string().min(10, 'Невірний номер телефону'),
  category: z.enum(['FAMILY','CIVIL','COMMERCIAL','CRIMINAL','MIGRATION','REALESTATE','LABOR','OTHER']),
  urgency: z.enum(['URGENT','WEEK','NORMAL']),
  description: z.string().min(10, 'Опис має містити мінімум 10 символів'),
  city: z.string().optional(),
});

export type IntakeSubmissionInput = z.infer<typeof intakeSubmissionSchema>;
