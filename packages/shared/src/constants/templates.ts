export interface TemplateField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'select';
  required: boolean;
  placeholder?: string;
  options?: string[];
  group?: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  fields: TemplateField[];
}

export const TEMPLATES: DocumentTemplate[] = [
  { id: 'pozov', name: 'Позовна заява', icon: 'FileText', description: 'Позовна заява до суду', fields: [
    { name: 'courtName', label: 'Назва суду', type: 'text', required: true, group: 'Суд' },
    { name: 'plaintiffName', label: "Ім'я позивача", type: 'text', required: true, group: 'Позивач' },
    { name: 'plaintiffAddress', label: 'Адреса позивача', type: 'text', required: true, group: 'Позивач' },
    { name: 'defendantName', label: "Ім'я відповідача", type: 'text', required: true, group: 'Відповідач' },
    { name: 'defendantAddress', label: 'Адреса відповідача', type: 'text', required: true, group: 'Відповідач' },
    { name: 'subject', label: 'Предмет позову', type: 'text', required: true, group: 'Справа' },
    { name: 'circumstances', label: 'Обставини справи', type: 'textarea', required: true, group: 'Справа' },
    { name: 'demands', label: 'Вимоги', type: 'textarea', required: true, group: 'Справа' },
  ]},
  { id: 'dogovir', name: 'Договір', icon: 'FileSignature', description: 'Типовий договір між сторонами', fields: [
    { name: 'contractType', label: 'Тип договору', type: 'select', required: true, options: ['Купівлі-продажу','Оренди','Надання послуг','Підряду'], group: 'Загальне' },
    { name: 'party1Name', label: 'Сторона 1', type: 'text', required: true, group: 'Сторони' },
    { name: 'party2Name', label: 'Сторона 2', type: 'text', required: true, group: 'Сторони' },
    { name: 'subject', label: 'Предмет договору', type: 'textarea', required: true, group: 'Умови' },
    { name: 'amount', label: 'Сума (грн)', type: 'text', required: false, group: 'Умови' },
    { name: 'term', label: 'Строк дії', type: 'text', required: false, group: 'Умови' },
  ]},
  { id: 'zayava', name: 'Заява', icon: 'FileEdit', description: 'Заява до державного органу', fields: [
    { name: 'recipientOrg', label: 'Назва органу', type: 'text', required: true, group: 'Адресат' },
    { name: 'recipientPosition', label: 'Посада керівника', type: 'text', required: true, group: 'Адресат' },
    { name: 'recipientName', label: "Ім'я керівника", type: 'text', required: true, group: 'Адресат' },
    { name: 'applicantName', label: "Ім'я заявника", type: 'text', required: true, group: 'Заявник' },
    { name: 'applicantAddress', label: 'Адреса заявника', type: 'text', required: true, group: 'Заявник' },
    { name: 'content', label: 'Зміст заяви', type: 'textarea', required: true, group: 'Зміст' },
  ]},
  { id: 'skarga', name: 'Скарга', icon: 'AlertTriangle', description: 'Скарга на дії/бездіяльність', fields: [
    { name: 'recipientOrg', label: 'Назва органу', type: 'text', required: true, group: 'Адресат' },
    { name: 'applicantName', label: "Ім'я скаржника", type: 'text', required: true, group: 'Скаржник' },
    { name: 'subject', label: 'Предмет скарги', type: 'text', required: true, group: 'Скарга' },
    { name: 'circumstances', label: 'Обставини', type: 'textarea', required: true, group: 'Скарга' },
    { name: 'demands', label: 'Вимоги', type: 'textarea', required: true, group: 'Скарга' },
  ]},
  { id: 'dovirenist', name: 'Довіреність', icon: 'UserCheck', description: 'Довіреність на представництво', fields: [
    { name: 'principalName', label: "Ім'я довірителя", type: 'text', required: true, group: 'Довіритель' },
    { name: 'principalPassport', label: 'Паспорт довірителя', type: 'text', required: true, group: 'Довіритель' },
    { name: 'agentName', label: "Ім'я довіреної особи", type: 'text', required: true, group: 'Довірена особа' },
    { name: 'agentPassport', label: 'Паспорт довіреної особи', type: 'text', required: true, group: 'Довірена особа' },
    { name: 'scope', label: 'Обсяг повноважень', type: 'textarea', required: true, group: 'Повноваження' },
    { name: 'validUntil', label: 'Дійсна до', type: 'date', required: true, group: 'Повноваження' },
  ]},
  { id: 'pretenzia', name: 'Претензія', icon: 'Mail', description: 'Досудова претензія', fields: [
    { name: 'recipientName', label: "Ім'я отримувача", type: 'text', required: true, group: 'Адресат' },
    { name: 'recipientAddress', label: 'Адреса отримувача', type: 'text', required: true, group: 'Адресат' },
    { name: 'senderName', label: "Ім'я відправника", type: 'text', required: true, group: 'Відправник' },
    { name: 'subject', label: 'Предмет претензії', type: 'text', required: true, group: 'Претензія' },
    { name: 'circumstances', label: 'Обставини', type: 'textarea', required: true, group: 'Претензія' },
    { name: 'demands', label: 'Вимоги', type: 'textarea', required: true, group: 'Претензія' },
    { name: 'deadline', label: 'Строк відповіді (днів)', type: 'text', required: true, group: 'Претензія' },
  ]},
  { id: 'vidzyv', name: 'Відзив на позов', icon: 'MessageSquare', description: 'Відзив на позовну заяву', fields: [
    { name: 'courtName', label: 'Назва суду', type: 'text', required: true, group: 'Суд' },
    { name: 'caseNumber', label: 'Номер справи', type: 'text', required: true, group: 'Суд' },
    { name: 'defendantName', label: "Ім'я відповідача", type: 'text', required: true, group: 'Відповідач' },
    { name: 'plaintiffName', label: "Ім'я позивача", type: 'text', required: true, group: 'Позивач' },
    { name: 'objections', label: 'Заперечення', type: 'textarea', required: true, group: 'Відзив' },
    { name: 'evidence', label: 'Докази', type: 'textarea', required: false, group: 'Відзив' },
  ]},
  { id: 'nda', name: 'NDA', icon: 'Lock', description: 'Угода про нерозголошення', fields: [
    { name: 'party1Name', label: 'Сторона 1', type: 'text', required: true, group: 'Сторони' },
    { name: 'party2Name', label: 'Сторона 2', type: 'text', required: true, group: 'Сторони' },
    { name: 'scope', label: 'Що є конфіденційним', type: 'textarea', required: true, group: 'Умови' },
    { name: 'term', label: 'Строк дії (років)', type: 'text', required: true, group: 'Умови' },
    { name: 'penalty', label: 'Штрафні санкції', type: 'text', required: false, group: 'Умови' },
  ]},
];
