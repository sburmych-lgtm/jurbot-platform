import { describe, expect, it } from 'vitest';
import { buildHighlightedBookingDates } from '../apps/web/src/lib/appointments';

describe('lawyer calendar highlight dates', () => {
  it('returns unique date keys for highlightable appointment states', () => {
    const result = buildHighlightedBookingDates([
      { date: '2026-05-10T09:00:00.000Z', status: 'PENDING' },
      { date: '2026-05-10T11:00:00.000Z', status: 'CONFIRMED' },
      { date: '2026-05-12T11:00:00.000Z', status: 'AWAITING_CLIENT_RESPONSE' },
      { date: '2026-05-12T13:00:00.000Z', status: 'CANCELLED' },
      { date: 'invalid', status: 'PENDING' },
    ]);

    expect(result).toEqual(['2026-05-10', '2026-05-12']);
  });
});
