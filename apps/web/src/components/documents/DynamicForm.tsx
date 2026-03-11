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

  const groups = new Map<string, TemplateField[]>();
  for (const field of template.fields) {
    const g = field.group ?? '\u0417\u0430\u0433\u0430\u043b\u044c\u043d\u0435';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(field);
  }

  return (
    <div className="space-y-5">
      <ProgressBar value={progress} label={`${filledCount} \u0437 ${template.fields.length} \u043f\u043e\u043b\u0456\u0432`} />
      {[...groups.entries()].map(([group, fields]) => (
        <div key={group}>
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wide mb-3">{group}</h3>
          <div className="space-y-3">
            {fields.map(field => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {field.label}
                  {field.required && <span className="text-accent-red ml-1">*</span>}
                </label>
                {field.type === 'select' ? (
                  <select
                    value={values[field.name] ?? ''}
                    onChange={e => onChange(field.name, e.target.value)}
                    className="w-full px-3 py-2.5 bg-bg-tertiary border border-border-default rounded-[14px] text-sm text-text-primary focus:border-accent-teal focus:outline-none"
                  >
                    <option value="">\u041e\u0431\u0435\u0440\u0456\u0442\u044c...</option>
                    {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    value={values[field.name] ?? ''}
                    onChange={e => onChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    rows={3}
                    className="w-full px-3 py-2.5 bg-bg-tertiary border border-border-default rounded-[14px] text-sm text-text-primary focus:border-accent-teal focus:outline-none resize-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={values[field.name] ?? ''}
                    onChange={e => onChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2.5 bg-bg-tertiary border border-border-default rounded-[14px] text-sm text-text-primary focus:border-accent-teal focus:outline-none"
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
