import { describe, expect, it } from 'vitest';
import { createAppointmentSchema } from '@jurbot/shared';

describe('appointment datetime contract', () => {
  it('rejects local datetime without timezone and accepts ISO datetime with Z', () => {
    const localParse = createAppointmentSchema.safeParse({
      type: 'CONSULT',
      date: '2026-03-17T11:00:00',
      lawyerId: 'd92f2f58-9284-43b8-b603-5f6072f7f005',
    });

    const isoParse = createAppointmentSchema.safeParse({
      type: 'CONSULT',
      date: '2026-03-17T11:00:00.000Z',
      lawyerId: 'd92f2f58-9284-43b8-b603-5f6072f7f005',
    });

    expect(localParse.success).toBe(false);
    expect(isoParse.success).toBe(true);
  });
});
