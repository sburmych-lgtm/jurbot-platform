import { TEMPLATES } from '@jurbot/shared';
import { AppError } from '../middleware/errorHandler.js';

export function list() {
  return TEMPLATES.map(({ id, name, icon, description, fields }) => ({
    id,
    name,
    icon,
    description,
    fieldCount: fields.length,
  }));
}

export function getById(id: string) {
  const template = TEMPLATES.find((t) => t.id === id);
  if (!template) {
    throw new AppError(404, 'Шаблон не знайдено');
  }
  return template;
}
