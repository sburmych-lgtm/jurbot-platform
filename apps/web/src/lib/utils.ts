export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatPrice(kopecks: number): string {
  if (kopecks === 0) return 'Безкоштовно';
  return `${(kopecks / 100).toLocaleString('uk-UA')} грн`;
}

export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
}
