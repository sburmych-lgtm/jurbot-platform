const HIGHLIGHTABLE_STATUSES = new Set([
  'PENDING',
  'CONFIRMED',
  'AWAITING_CLIENT_RESPONSE',
  'COMPLETED',
]);

export interface CalendarAppointmentLike {
  date: string;
  status: string;
}

export function buildHighlightedBookingDates(
  appointments: CalendarAppointmentLike[],
): string[] {
  const highlighted = new Set<string>();

  for (const item of appointments) {
    if (!HIGHLIGHTABLE_STATUSES.has(item.status)) {
      continue;
    }

    const dateKey = item.date.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      highlighted.add(dateKey);
    }
  }

  return [...highlighted].sort();
}
