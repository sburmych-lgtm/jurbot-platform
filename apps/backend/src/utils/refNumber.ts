let bookingCounter = 0;
let intakeCounter = 0;

export function generateBookingRef(): string {
  bookingCounter++;
  const year = new Date().getFullYear();
  return `BK-${year}-${bookingCounter.toString().padStart(4, '0')}`;
}

export function generateIntakeRef(): string {
  intakeCounter++;
  const year = new Date().getFullYear();
  return `INQ-${year}-${intakeCounter.toString().padStart(4, '0')}`;
}
