import { z } from 'zod';

export const createMessageSchema = z.object({
  text: z.string().min(1, 'Повідомлення не може бути порожнім'),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;
