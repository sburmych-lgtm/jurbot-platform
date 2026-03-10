import { FileText } from 'lucide-react';
import type { DocumentTemplate } from '@jurbot/shared';

interface TemplateCardProps {
  template: DocumentTemplate;
  onClick: () => void;
}

export function TemplateCard({ template, onClick }: TemplateCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl p-4 text-left shadow-sm hover:shadow-md transition border border-navy-100 active:scale-[0.98]"
    >
      <div className="w-10 h-10 rounded-lg bg-navy-100 text-navy-600 flex items-center justify-center mb-3">
        <FileText size={20} />
      </div>
      <h3 className="font-semibold text-sm text-navy-800">{template.name}</h3>
      <p className="text-xs text-navy-400 mt-1">{template.description}</p>
    </button>
  );
}
