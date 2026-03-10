import type { DocumentTemplate, TemplateField } from '@jurbot/shared';
import { ProgressBar } from '@/components/ui/ProgressBar';

interface DynamicFormProps {
  template: DocumentTemplate;
  values: Record<string, string>;
  onChange: (field: string, value: string) => void;
}

export function DynamicForm({ template, values, onChange }: DynamicFormProps) {
  const filledCount = template.fields.filter(f => values[f.name]?.trim()).length;
  const progress = Math.round((filledCount / template.fields.length) * 100);

  // Group fields
  const groups = new Map<string, TemplateField[]>();
  for (const field of template.fields) {
    const g = field.group ?? 'Загальне';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(field);
  }

  return (
    <div className="space-y-5">
      <ProgressBar value={progress} label={`${filledCount} з ${template.fields.length} полів`} />
      {[...groups.entries()].map(([group, fields]) => (
        <div key={group}>
          <h3 className="text-xs font-bold text-navy-500 uppercase tracking-wide mb-3">{group}</h3>
          <div className="space-y-3">
            {fields.map(field => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-navy-700 mb-1">
                  {field.label}
                  {field.required && <span className="text-red-400 ml-1">*</span>}
                </label>
                {field.type === 'select' ? (
                  <select
                    value={values[field.name] ?? ''}
                    onChange={e => onChange(field.name, e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-navy-200 rounded-lg text-sm focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none"
                  >
                    <option value="">Оберіть...</option>
                    {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    value={values[field.name] ?? ''}
                    onChange={e => onChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    rows={3}
                    className="w-full px-3 py-2.5 bg-white border border-navy-200 rounded-lg text-sm focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none resize-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={values[field.name] ?? ''}
                    onChange={e => onChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2.5 bg-white border border-navy-200 rounded-lg text-sm focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
