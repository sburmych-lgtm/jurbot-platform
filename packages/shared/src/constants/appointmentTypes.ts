export const APPOINTMENT_TYPES = [
  { id: 'FREE', label: 'Безкоштовна консультація', duration: 30, price: 0, description: 'Ознайомлення зі справою' },
  { id: 'CONSULT', label: 'Консультація', duration: 60, price: 150000, description: 'Детальний розбір справи' },
  { id: 'ANALYSIS', label: 'Аналіз документів', duration: 90, price: 250000, description: 'Повний аналіз документів' },
] as const;
