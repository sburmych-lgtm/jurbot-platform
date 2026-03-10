export const CASE_STAGES = [
  { id: 'INTAKE', label: 'Прийом', description: 'Звернення прийнято' },
  { id: 'ANALYSIS', label: 'Аналіз', description: 'Юрист аналізує справу' },
  { id: 'PREPARATION', label: 'Підготовка', description: 'Готуються документи' },
  { id: 'FILED', label: 'Подано', description: 'Документи подано до суду' },
  { id: 'AWAITING', label: 'Очікування', description: 'Очікування рішення суду' },
  { id: 'COMPLETED', label: 'Завершено', description: 'Справу закрито' },
] as const;
