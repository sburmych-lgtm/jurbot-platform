import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Невірний формат email'),
  password: z.string().min(6, 'Пароль має містити мінімум 6 символів'),
});
export const registerSchema = z.object({
  name: z.string().min(2, "Ім'я має містити мінімум 2 символи"),
  email: z.string().email('Невірний формат email'),
  password: z.string().min(6, 'Пароль має містити мінімум 6 символів'),
  role: z.enum(['LAWYER', 'CLIENT']),
  phone: z.string().optional(),
  city: z.string().optional(),
});
export const portalLoginSchema = z.object({
  accessCode: z.string().length(6, 'Код доступу має містити 6 символів'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type PortalLoginInput = z.infer<typeof portalLoginSchema>;
