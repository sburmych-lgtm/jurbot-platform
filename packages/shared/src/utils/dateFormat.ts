const MONTHS_UK = ['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'] as const;
const MONTHS_UK_GENITIVE = ['січня','лютого','березня','квітня','травня','червня','липня','серпня','вересня','жовтня','листопада','грудня'] as const;
const DAYS_UK = ['Нд','Пн','Вт','Ср','Чт','Пт','Сб'] as const;
const DAYS_UK_FULL = ['Неділя','Понеділок','Вівторок','Середа','Четвер',"П'ятниця",'Субота'] as const;

export function formatDateUk(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${d.getDate()} ${MONTHS_UK_GENITIVE[d.getMonth()]} ${d.getFullYear()}`;
}
export function formatTimeUk(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}
export function formatDateTimeUk(date: Date | string): string {
  return `${formatDateUk(date)}, ${formatTimeUk(date)}`;
}
export function getMonthNameUk(monthIndex: number): string { return MONTHS_UK[monthIndex] ?? ''; }
export function getDayNameUk(dayIndex: number): string { return DAYS_UK[dayIndex] ?? ''; }
export function getDayFullNameUk(dayIndex: number): string { return DAYS_UK_FULL[dayIndex] ?? ''; }
export { MONTHS_UK, MONTHS_UK_GENITIVE, DAYS_UK, DAYS_UK_FULL };
