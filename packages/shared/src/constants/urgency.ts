export const URGENCY_OPTIONS = [
  { id: 'URGENT', label: 'Терміново', description: 'Потрібна допомога протягом 24 годин', color: 'red' },
  { id: 'WEEK', label: 'Протягом тижня', description: 'Є тиждень на вирішення', color: 'yellow' },
  { id: 'NORMAL', label: 'Не терміново', description: 'Можна планувати', color: 'green' },
] as const;
